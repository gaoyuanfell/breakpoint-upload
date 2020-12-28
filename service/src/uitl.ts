import path from "path";
import fs from "fs";

/**
 * 删除文件夹下的所有文件或文件夹
 * @param path
 */
export function deleteFolderRecursive(path: string) {
  let files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach((file) => {
      let curPath = path + "/" + file;
      if (fs.statSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

/**
 * 获取文件后缀
 * @param originalname
 */
export function nameSuffix(originalname: string) {
  let names = originalname.split(".");
  return names[names.length - 1];
}

/**
 *
 * @param filePath 文件夹完整路径
 */
export function mkdirsSync(filePath: string) {
  let array = filePath.split("/");
  let _p = "";
  array.forEach((data) => {
    _p += data + "/";
    if (!fs.existsSync(_p)) fs.mkdirSync(_p);
  });
}

export function getNowTempPath() {
  // `uploads/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}/temp`
  return `uploads/temp`;
}

export function getUploadsPath() {
  // `uploads/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}/temp`
  return `uploads`;
}

// 合并分片文件 逐个读取写入
export async function fileMerge(target: string, result: string) {
  let files = [];
  if (fs.existsSync(result)) {
    files = fs.readdirSync(result);
    if (files && files.length) {
      let cws = fs.createWriteStream(
        path.join(`${target}.${nameSuffix(files[0])}`),
        {
          highWaterMark: 2 * 1024 * 1024, // 2 * 1024 * 1024
        }
      );
      for (let index = 0; index < files.length; index++) {
        await forEachWrite(cws, result, files[index]);
      }
      cws.close();
    }
  }
}

async function forEachWrite(cws: fs.WriteStream, result: string, item: string) {
  return new Promise((resolve, reject) => {
    let crs = fs.createReadStream(path.join(result, item), {
      highWaterMark: 2 * 1024 * 1024, // 2 * 1024 * 1024
    });
    crs.on("error", (err) => {
      crs.close();
      reject(err);
    });
    crs.on("end", () => {
      crs.close();
      resolve(undefined);
    });
    // crs.pipe(cws);
    crs.on("data", (chunk) => {
      cws.write(chunk);
    });
  });
}

export const pickTypedArrayBuffer = (bytes: Uint8Array) => {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.length * bytes.BYTES_PER_ELEMENT
  );
};
