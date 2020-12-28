import { blobSlice, generateFormData } from "./util";

type Item = {
  data: FormData;
};

type _UploadOptions = {
  chunkSize: number;
  concurrent: number;
  fieldname: string;
  // beforeUpload: (item: FormData, file: File) => void;
  // afterUpload: (item: FormData, file: File) => void;
};

type UploadOptions = Partial<_UploadOptions>;

/**
 *
 * 1、开始上传 设置并发数
 * 2、任何一个完成都会去执行队列开始追加任务
 * 3、可以随时暂停开始任务
 * 2 * 1024 * 1024
 */
export function queueUpload(
  file: File,
  options: UploadOptions = {
    chunkSize: 2 * 1024 * 1024,
    concurrent: 4,
    fieldname: "file",
  }
) {
  let { chunkSize, concurrent = 1, fieldname = "file" } = options;
  let chunks = blobSlice(file, chunkSize);
  let formDatas = generateFormData(chunks, file.name, fieldname);
  let queue: Item[] = [];
  for (let index = 0; index < formDatas.length; index++) {
    const element = formDatas[index];
    queue.push({
      data: element,
    });
  }

  let concurrentQueue: Item[] = []; // 执行中的数据
  let valve = false; // 阀门
  let isDone = false;

  // 执行
  let execute = (item: FormData) => {};
  // 队列完成
  let done = () => {};

  const active = {
    stop: function stop() {
      valve = false;
    },
    start: function start() {
      valve = true;
      if (queue.length === 0 && !isDone) {
        done.call(null);
        isDone = true;
        return;
      }
      while (concurrentQueue.length < concurrent) {
        let item = queue.shift();
        if (!item) return;
        concurrentQueue.push(item);
        execute.call(null, item.data);
      }
    },
    // 完成后继续下一个
    next: function next() {
      concurrentQueue.shift();
      if (!valve) return;
      active.start();
    },
    execute: function (fn: (item?: FormData) => void) {
      execute = fn;
    },
    done: function (fn: () => void) {
      done = fn;
    },
  };
  return {
    ...active,
  };
}
