import { fileMd5, HTTP, queueUpload } from "@breakpoint/upload";
const baseUrl = "http://127.0.0.1:3001";
let fileRef = document.getElementById("file");
let fileUploadRef = document.getElementById("fileUpload");
fileUploadRef.onclick = () => {
    let files = fileRef.files;
    if (!files)
        return;
    for (let index = 0; index < files.length; index++) {
        const file = files[index];
        console.info(file);
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
        concurrent: 12,
        fieldname: "file",
    });
    _stop = stop;
    _start = start;
    const task = async () => {
        let md5 = await fileMd5(file);
        done(async () => {
            console.info("完成");
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
        console.info(renewalArr);
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
            console.info();
            upload();
        });
        start();
        console.info("开始");
    };
    task();
}
