import { Readable } from "stream";

class RandomNumberStream extends Readable {
  constructor() {
    super();
  }
  _read() {
    setTimeout(() => {
      const randomNumber = parseInt(`${Math.random() * 10000}`);
      // 只能 push 字符串或 Buffer，为了方便显示打一个回车
      this.push(`${randomNumber}\n`);
    }, 100);
  }
}

const rns = new RandomNumberStream();
rns.pipe(process.stdout);
