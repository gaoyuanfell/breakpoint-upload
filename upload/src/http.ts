interface HTTP {
  request: Request;
  resule: <T>() => Promise<T>;
}

interface HTTPConstructor {
  new (request: Request): HTTP;
  request: (url: string, init?: RequestInit) => HTTP;
  post: (url: string, body?: { [key: string]: any }) => HTTP;
  get: (url: string, body?: { [key: string]: any }) => HTTP;
}

async function _fetch(request: Request) {
  let response = await fetch(request);
  let data = await response.json();
  return data;
}

const HTTP = (function (this: HTTP, request: Request) {
  this.request = request;
} as any) as HTTPConstructor;

HTTP.prototype.resule = async function () {
  return _fetch(this.request);
};

HTTP.request = (url: string, init?: RequestInit) => {
  let request = new Request(url, init);
  return new HTTP(request);
};

HTTP.post = (url: string, body?: { [key: string]: any }) => {
  let options: RequestInit = {
    method: "POST",
  };
  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.headers = {
        "Content-Type": "application/json",
      };
      options.body = JSON.stringify(body);
    }
  }
  return HTTP.request(url, options);
};

HTTP.get = (url: string, body?: { [key: string]: any }) => {
  let options: RequestInit = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return HTTP.request(url, options);
};

export { HTTP };
