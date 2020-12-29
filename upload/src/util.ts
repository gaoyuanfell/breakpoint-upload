import SparkMd5 from "spark-md5";

type ChunksType = {
  byteOffset: number;
  position: number;
  blob: Blob;
  sizes: number;
  size: number;
  type: string;
};

export function blobSlice(
  blob: File,
  chunkSize = 2 * 1024 * 1024
): ChunksType[] {
  let chunks: ChunksType[] = [];
  let sizes = blob.size;
  let type = blob.type;
  let [start, end] = [0, 0];
  while (true) {
    end += chunkSize;
    let _blob = blob.slice(start, end);
    let chunk = {
      byteOffset: 0,
      position: start,
      blob: _blob,
      sizes: sizes,
      size: _blob.size,
      type: type,
    };
    start += chunkSize;
    if (!_blob.size) break;
    chunks.push(chunk);
  }
  return chunks;
}

export function generateFormData(
  chunks: ChunksType[],
  filename: string,
  fieldname: string
) {
  return chunks.map((chunk, index) => {
    let fData = new FormData();
    fData.append("file", chunk.blob, filename);
    fData.append("fieldname", fieldname);
    fData.append("chunkIndex", `${index}`);
    fData.append("chunkCount", `${chunks.length}`);
    fData.append("byteOffset", `${chunk.byteOffset}`);
    fData.append("position", `${chunk.position}`);
    fData.append("sizes", `${chunk.sizes}`);
    fData.append("type", `${chunk.type}`);
    fData.append("size", `${chunk.size}`);
    return fData;
  });
}

export async function fileMd5(file: File) {
  return new Promise<string>((r, j) => {
    let f = new FileReader();
    let arrHash = new SparkMd5.ArrayBuffer();
    let chunks = fileChunk2(blobSlice(file, 20 * 1024 * 1024));
    const queue = () => {
      let chunk = chunks.shift();
      if (!chunk) {
        r(arrHash.end());
        return;
      }
      f.readAsArrayBuffer(chunk.blob);
    };
    f.onload = () => {
      if (f.result && f.result instanceof ArrayBuffer) {
        arrHash.append(f.result);
      }
      queue();
    };
    f.onerror = () => {
      j();
    };
    queue();
  });
}

// 获取多个分片中的其中二个分片来计算md5
export function fileChunk2(chunks: ChunksType[]) {
  if (chunks.length < 3) {
    return chunks;
  }
  let c = [];
  let length = chunks.length;
  c.push(chunks[0]);
  c.push(chunks[length - 1]);
  return c;
}
