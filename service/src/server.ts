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
  uintCodeCfg,
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
  let fi: any[] = [];

  uintCodeCfg(arr, (uint32, uint8) => {
    if (uint8[0] === 1) {
      fi.push(uint32[0]);
    }
  });

  res.send({
    code: 200,
    data: {
      list: fi,
    },
  });
});

app.use("/file", routeFile);

export default function bootstrap(fn: () => void) {
  app.listen(3001, fn);
}
