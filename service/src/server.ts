import fs from "fs";
import path from "path";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { makeField, makeUpload } from "./middleware";
import multer from "multer";
import {
  deleteFolderRecursive,
  fileMerge,
  getNowTempPath,
  getUploadsPath,
  mkdirsSync,
  nameSuffix,
  pickTypedArrayBuffer,
} from "./uitl";
const uuid = require("uuid");

const app = express();
console.info(path.join(__dirname, "../uploads/"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads/")));

app.use(bodyParser.json()); // for parsing application/json
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
); // for parsing application/x-www-form-urlencoded

app.use(cors()); //跨域

let routeFile = express.Router();

routeFile.post("/upload", makeField(), makeUpload(), (req, res) => {
  res.send({
    code: 200,
    data: req.body,
  });
});

/**
 * 断点续传
 * 检查是否已经上传完成，是直接返回地址
 * 没有上传完成就检查分片状态，返回已处理过的分片
 */
routeFile.post("/renewal", (req, res) => {
  let { md5, filename } = req.body;
  let _path = `${getUploadsPath()}/${md5}.${nameSuffix(filename)}`;
  if (fs.existsSync(_path)) {
    res.send({
      code: 200,
      data: {
        path: _path,
      },
    });
    return;
  }

  let pathCfgTmp = `${getNowTempPath()}/${md5}.${nameSuffix(filename)}.cfg`;
  if (!fs.existsSync(pathCfgTmp)) {
    res.send({
      code: 200,
      data: {
        list: [],
      },
    });
    return;
  }

  let buf = fs.readFileSync(pathCfgTmp);
  let arr = pickTypedArrayBuffer(buf);
  let byteOffset = 0;
  let fi = [];
  let chunkCount = arr.byteLength / 12;
  for (let index = 0; index < chunkCount; index++) {
    byteOffset = index * 12;
    let a = new Uint32Array(arr, byteOffset);
    let b = new Uint8Array(arr, byteOffset + 4);
    if (b[0] === 1) {
      fi.push(a[0]);
    }
  }

  res.send({
    code: 200,
    data: {
      list: fi,
    },
  });
});

// 上传配置
// let storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     let uploadPath = getNowTempPath();
//     mkdirsSync(uploadPath);
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${uuid.v4()}.${nameSuffix(file.originalname)}`);
//   },
// });

// let upload = multer({
//   storage: storage,
//   limits: {},
//   fileFilter: (req, file, cb) => {
//     cb(null, true);
//   },
// });

// routeFile.post("/upload", upload.single("file"), (req, res) => {
//   let { chunkIndex, chunkCount, md5 } = req.body;
//   let {
//     originalname,
//     fieldname,
//     filename,
//     destination,
//     size,
//     path: _path,
//   } = req.file;

//   if (chunkCount == 1) {
//     fs.renameSync(
//       _path,
//       path.join(path.join(destination, "../"), `${md5}.${nameSuffix(filename)}`)
//     );
//     res.send({
//       code: 200,
//     });
//   } else {
//     const chunksPath = path.join(destination, md5, "/");
//     if (!fs.existsSync(chunksPath)) mkdirsSync(chunksPath);

//     // 保证文件顺序 可能不同的系统排序方式会不一样 可能有坑 解决办法 手动生成文件名 逐个读取
//     fs.renameSync(
//       _path,
//       path.join(
//         chunksPath,
//         `${String(chunkIndex).padStart(
//           String(+chunkCount + 1).length,
//           "0"
//         )}-${md5}.${nameSuffix(filename)}`
//       )
//     );
//     res.send({
//       code: 200,
//     });
//   }
// });

// 合并分片
// routeFile.post("/merge", (req, res) => {
//   let { md5 } = req.body;
//   console.info(md5);
//   let uploadPath = getNowTempPath();
//   let target = path.join(path.join(uploadPath, "../"), md5);
//   let result = path.join(uploadPath, md5);
//   fileMerge(target, result).then(() => {
//     deleteFolderRecursive(result);
//     console.info("合并完成");
//     res.send({
//       code: 200,
//       md5,
//     });
//   });
// });

// routeFile.post("/renewal", (req, res) => {
//   let { md5 } = req.body;
//   let uploadPath = getNowTempPath();

//   let _path = path.join(uploadPath, md5, "/");
//   let renewalList: number[] = [];
//   if (fs.existsSync(_path)) {
//     let files = fs.readdirSync(_path);
//     files.forEach((file) => {
//       renewalList.push(parseInt(file.substr(0, file.indexOf("-"))));
//     });
//     res.send({
//       code: 200,
//       data: renewalList.sort((a, b) => a - b),
//       md5,
//     });
//   } else {
//     res.send({
//       code: 200,
//       data: renewalList,
//       md5,
//     });
//   }
// });

app.use("/file", routeFile);

export default function bootstrap(fn: () => void) {
  app.listen(3001, fn);
}
