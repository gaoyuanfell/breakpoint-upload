import { fileMd5, HTTP, queueUpload } from "@breakpoint/upload";

const baseUrl = "http://127.0.0.1:3001";
let fileRef = document.getElementById("file") as HTMLInputElement;

type Result<T> = {
  code: number;
  data: T;
};

let fileUploadRef = document.getElementById("fileUpload");
fileUploadRef!.onclick = () => {
  let files = fileRef.files;
  if (!files) return;
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    console.info(file);
    uploadFile(file);
  }
  fileRef.value = "";
};

function uploadFile(file: File) {
  let { execute, start, stop, next, done } = queueUpload(file);
  const task = async () => {
    let md5 = await fileMd5(file);
    // done(async () => {
    //   let res = await HTTP.post(baseUrl + "/file/merge", { md5 }).resule();
    //   console.info(res);
    // });
    let res = await HTTP.post(baseUrl + "/file/renewal", {
      md5,
      filename: file.name,
    }).resule<Result<{ path: string; list: number[] }>>();
    if (res.code !== 200) return;
    if (res.data.path) {
      console.info(res.data.path);
      return;
    }
    let renewalArr = res.data.list;
    console.info(renewalArr);
    execute((item) => {
      if (!item) return;
      item.set("md5", md5);

      let chunkIndex = item.get("chunkIndex");
      if (chunkIndex && renewalArr.indexOf(+chunkIndex) !== -1) {
        next();
        return;
      }
      const upload = async () => {
        let res = await HTTP.post(baseUrl + "/file/upload", item).resule<any>();
        console.info(res);
        next();
      };
      console.info();
      upload();
    });
    start();
  };
  task();
}
