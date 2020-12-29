import { fileMd5, HTTP, queueUpload } from "@breakpoint/upload";
const baseUrl = "http://127.0.0.1:3001";
let fileRef = document.getElementById("file");
// https://fetch.spec.whatwg.org/
// function asd(file: File) {
//   const stream = new ReadableStream({
//     start(controller) {
//       let r = new FileReader();
//       r.onload = (e) => {
//         console.info(r.result);
//         console.info(r.readyState);
//         if (r.readyState === 2) {
//           controller.close();
//           return;
//         }
//         controller.enqueue(r.result);
//       };
//       r.readAsArrayBuffer(file);
//     },
//   });
//   let r = new Request(baseUrl + "/file/test", {
//     method: "POST",
//     body: stream,
//     keepalive: true,
//     headers: { "Content-Type": "multipart/form-data" },
//   });
//   setTimeout(() => {
//     fetch(r.clone())
//       .then((response) => response.json())
//       .then((result) => console.info(result));
//   }, 1000);
// }
let fileUploadRef = document.getElementById("fileUpload");
fileUploadRef.onclick = () => {
    let files = fileRef.files;
    if (!files)
        return;
    for (let index = 0; index < files.length; index++) {
        const file = files[index];
        uploadFile(file);
    }
    fileRef.value = "";
};
let _stop;
let fileStopRef = document.getElementById("fileStop");
fileStopRef.onclick = () => {
    if (typeof _stop === "function")
        _stop();
};
let _start;
let fileRenewalRef = document.getElementById("fileRenewal");
fileRenewalRef.onclick = () => {
    if (typeof _start === "function")
        _start();
};
function uploadFile(file) {
    let { execute, start, stop, next, done } = queueUpload(file, {
        chunkSize: 2 * 1024 * 1024,
        concurrent: 6,
        fieldname: "file",
    });
    _stop = stop;
    _start = start;
    const task = async () => {
        let md5 = await fileMd5(file);
        done(async () => {
            console.info("finish");
        });
        let res = await HTTP.post(baseUrl + "/file/renewal", {
            md5,
            filename: file.name,
        }).resule();
        if (res.code !== 200)
            return;
        if (res.data.path) {
            console.info(res.data.path);
            return;
        }
        let renewalArr = res.data.list;
        execute((item) => {
            if (!item)
                return;
            item.set("md5", md5);
            let chunkIndex = item.get("chunkIndex");
            if (chunkIndex && renewalArr.indexOf(+chunkIndex) !== -1) {
                next();
                return;
            }
            const upload = async () => {
                let res = await HTTP.post(baseUrl + "/file/upload", item).resule();
                console.info(res);
                next();
            };
            upload();
        });
        start();
        console.info("start");
    };
    task();
}
