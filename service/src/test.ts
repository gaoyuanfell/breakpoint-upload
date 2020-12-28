import fs from "fs/promises";
import os from "os";

console.info(fs);

console.info(os.tmpdir());

// fs.open(__dirname + "/test.txt", "r+", function (err, fd) {
//   if (err) throw err;
//   let buffer = Buffer.from("我爱nodejs编程");
//   console.info(buffer);
//   let arr = new ArrayBuffer(0);
//   let darr = new Uint8Array(arr);
//   let position = 0;

//   console.info(fs.write);

//   fs.write(fd, darr, 0, darr.length, position, function (err, written) {
//     fs.write(fd, buffer, 0, buffer.length, 2, function (err1, written1) {
//       console.info(written1);
//     });

//     // console.info(written);
//     // let arr1 = new ArrayBuffer(buffer.length);
//     // let darr1 = new Uint8Array(arr1);
//     // fs.read(fd, darr1, 0, darr1.length, 0, (err, bytesRead, _buffer) => {
//     //   console.info(err);
//     //   console.info(bytesRead);
//     //   for (let index = 0; index < buffer.length; index++) {
//     //     _buffer[index] = buffer[index];
//     //   }
//     //   console.info(_buffer);
//     // });
//   });
// });
