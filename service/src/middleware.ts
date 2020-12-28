import Busboy from "busboy";
import os from "os";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import {
  getNowTempPath,
  getUploadsPath,
  nameSuffix,
  pickTypedArrayBuffer,
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
    });
    busboy.on("field", (fieldname, value) => {
      appendField(req.body, fieldname, value);
    });
    busboy.on("finish", () => {
      next();
    });
    req.pipe(busboy);
  };
}

function chunkFinish(
  pathCfgTmp: string,
  chunkCount: number,
  chunkIndex: number
) {
  // 读取上传详情文件查看分片上传状态
  let buf = fs.readFileSync(pathCfgTmp);

  let arr = pickTypedArrayBuffer(buf);
  let byteOffset = 0;
  let fi = [];
  // let chunkCount = arr.byteLength / 12;
  for (let index = 0; index < chunkCount; index++) {
    byteOffset = index * 12;
    let a = new Uint32Array(arr, byteOffset);
    let b = new Uint8Array(arr, byteOffset + 4);
    if (index === +chunkIndex) {
      b[0] = 1;
    }
    fi.push({
      index: a[0],
      complete: b[0],
    });
  }
  // 写入修改后的状态
  fs.writeFileSync(pathCfgTmp, new Uint8Array(arr));
  return fi;
}

function readCacheFile(
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

  let fd = fs.openSync(pathTmp, "r+");
  // 读取缓存文件
  let rs = fs.createReadStream(finalPath);
  let _position = +position;
  rs.on("data", (chunk) => {
    let __position = _position;
    if (chunk instanceof Uint8Array) {
      _position += chunk.length;
      fs.write(fd, chunk, 0, chunk.length, __position, () => {});
    }
  });
  rs.on("end", async () => {
    fs.closeSync(fd);

    // 删除缓存文件
    fs.unlinkSync(finalPath);

    let fi = chunkFinish(pathCfgTmp, +chunkCount, +chunkIndex);
    // 上传完成后将文件移动到正式文件夹下，并删除分片状态文件
    if (fi.filter((f) => f.complete === 1).length === +chunkCount) {
      fs.unlinkSync(pathCfgTmp);
      let _path = `${getUploadsPath()}/${md5}.${nameSuffix(originalname)}`;
      fs.renameSync(pathTmp, _path);
      appendField(req.body[fieldname], "path", _path);
    }
    next();
  });
}

/***
 *
 * 写文件
 *  创建一个和源文件同样大小的种子文件
 *  然后再创建一个记录分片上传记录
 */
export function makeUpload() {
  return function upload(req: Request, res: Response, next: NextFunction) {
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
      let byteOffset = 0;
      for (let index = 0; index < +chunkCount; index++) {
        byteOffset = index * 12;
        let u = new Uint32Array(arr, byteOffset);
        let b = new Uint8Array(arr, byteOffset + 4);
        u[0] = index;
        b[0] = 0;
      }
      fs.writeFileSync(pathCfgTmp, new Uint8Array(arr));
    }

    readCacheFile(req, next, pathTmp, pathCfgTmp);
  };
}
