import Busboy from "busboy";
import os from "os";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import {
  getNowTempPath,
  getUploadsPath,
  mkdirsSync,
  nameSuffix,
  pickTypedArrayBuffer,
  uintCodeCfg,
} from "./uitl";
const uuid = require("uuid");
const appendField = require("append-field");

export function makeField() {
  return function Field(req: Request, _: Response, next: NextFunction) {
    let busboy = new Busboy({
      headers: req.headers,
    });
    busboy.on("file", (fieldname, fileStream, filename, encoding, mimetype) => {
      if (!filename) return fileStream.resume();
      let finalPath = path.join(os.tmpdir(), `${uuid.v4()}-${filename}`);

      let file = {
        finalPath: finalPath,
        fieldname: fieldname,
        originalname: filename,
        encoding: encoding,
        mimetype: mimetype,
      };
      appendField(req.body, fieldname, file);
      let outStream = fs.createWriteStream(finalPath);
      fileStream.pipe(outStream);
      fileStream.on("end", () => {
        outStream.close();
      });
    });
    busboy.on("field", (fieldname, value) => {
      appendField(req.body, fieldname, value);
    });
    busboy.on("finish", () => {
      req.unpipe(busboy);
      next();
    });
    req.pipe(busboy);
  };
}

async function chunkFinish(pathCfgTmp: string, chunkIndex: number) {
  // 读取上传详情文件查看分片上传状态
  // 保证分片状态文件同步读取和写入
  let buf = fs.readFileSync(pathCfgTmp);

  let arr = pickTypedArrayBuffer(buf);
  let fi: any[] = [];
  uintCodeCfg(arr, (uint32, uint8, index) => {
    if (index === +chunkIndex) {
      uint8[0] = 1;
    }
    fi.push({
      index: uint32[0],
      complete: uint8[0],
    });
  });

  // 写入修改后的状态
  fs.writeFileSync(pathCfgTmp, new Uint8Array(arr));
  return fi;
}

async function readCacheFile(
  req: Request,
  next: NextFunction,
  pathTmp: string,
  pathCfgTmp: string
) {
  let {
    sizes,
    size,
    byteOffset,
    position,
    chunkIndex,
    chunkCount,
    md5,
    type,
    fieldname,
  } = req.body;

  let { originalname, encoding, mimetype, finalPath, buffers } = req.body[
    fieldname
  ];

  let fileHandle = await fs.promises.open(pathTmp, "r+");
  // 读取缓存文件
  let rs = fs.createReadStream(finalPath);
  let _position = +position;
  rs.on("data", (chunk) => {
    let __position = _position;
    if (chunk instanceof Uint8Array) {
      _position += chunk.length;
      fs.write(fileHandle.fd, chunk, 0, chunk.length, __position, () => {});
    }
  });
  rs.on("end", async () => {
    await fileHandle.close();

    // 删除缓存文件
    fs.promises.unlink(finalPath);

    let fi = await chunkFinish(pathCfgTmp, +chunkIndex);
    // 上传完成后将文件移动到正式文件夹下，并删除分片状态文件
    if (fi.filter((f) => f.complete === 1).length === +chunkCount) {
      fs.promises.unlink(pathCfgTmp);
      let _path = `${getUploadsPath()}/${md5}.${nameSuffix(originalname)}`;
      await fs.promises.rename(pathTmp, _path);
      appendField(req.body[fieldname], "path", _path);
    }

    rs.close();
    next();
  });
}

/***
 *
 * 写文件
 * 创建一个和源文件同样大小的种子文件
 * 然后再创建一个记录分片上传记录
 */
export function makeUpload() {
  return function Upload(req: Request, res: Response, next: NextFunction) {
    let {
      sizes,
      size,
      byteOffset,
      position,
      chunkIndex,
      chunkCount,
      md5,
      type,
      fieldname,
    } = req.body;

    let { originalname, encoding, mimetype, finalPath, buffers } = req.body[
      fieldname
    ];

    if (!fs.existsSync(getNowTempPath())) {
      mkdirsSync(getNowTempPath());
    }

    // 分片待写入文件
    let pathTmp = `${getNowTempPath()}/${md5}.${nameSuffix(originalname)}`;
    if (!fs.existsSync(pathTmp)) {
      fs.writeFileSync(pathTmp, new Uint8Array());
    }

    // 分片上传状态
    let pathCfgTmp = `${getNowTempPath()}/${md5}.${nameSuffix(
      originalname
    )}.cfg`;
    if (!fs.existsSync(pathCfgTmp)) {
      let arr = new ArrayBuffer(+chunkCount * 12);
      uintCodeCfg(arr, (uint32, uint8, index) => {
        uint32[0] = index;
        uint8[0] = 0;
      });
      fs.writeFileSync(pathCfgTmp, new Uint8Array(arr));
    }

    readCacheFile(req, next, pathTmp, pathCfgTmp);
  };
}
