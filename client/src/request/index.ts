import * as https from 'https';
import { IncomingMessage, ClientRequest } from 'http';
import HostContext from '../context/HostContext';
import * as FormData from 'form-data';

export default class Request {
  options: https.RequestOptions;

  constructor(
    options?: Omit<https.RequestOptions, 'headers'>,
    headers?: Record<string, any>
  ) {
    this.options = {
      headers: {
        'Content-Type': 'application/json',
        Cookie: HostContext.requestContext.toString(),
        'user-agent': 'vscode',
        ...headers,
      },
      hostname: HostContext.serverHost,
      port: HostContext.serverPort,
      rejectUnauthorized: false,
      method: 'GET',
      ...options,
    };
  }

  makeRequest(data?: any | FormData): Promise<string> {
    if (HostContext.requestContext.cookie.ctoken) {
      this.options.headers['x-csrf-token'] =
        HostContext.requestContext.cookie.ctoken;
    }

    return new Promise((resolve, reject) => {
      let body = '';
      let success = true;

      const responseCallback = (res: IncomingMessage) => {
        this.processResponseHeaders(res);
        if (res.statusCode < 200 || res.statusCode >= 300) {
          success = false;
        }

        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          console.log('response:', body);
          success ? resolve(body) : reject(body);
        });
      };

      let req: ClientRequest;

      if (data instanceof FormData) {
        req = data.submit(
          { ...this.options, protocol: 'https:' },
          (err, res) => {
            if (err) {
              console.error(err);
              throw err;
            }
            responseCallback(res);
          }
        );
      } else {
        req = https.request(this.options, responseCallback);
        req.on('error', (e) => {
          console.error(e);
          reject(e);
        });
        data && req.write(JSON.stringify(data));

        req.end();
      }
    });
  }

  /**
   * - 处理 set-cookie 头: 更新 cookie 缓存
   */
  private processResponseHeaders(response: IncomingMessage) {
    const headers = response.headers;
    if (headers['set-cookie']) {
      this.updateCookie(headers['set-cookie']);
    }
  }

  private updateCookie(
    setCookieHeaders: string[],
    result?: Record<string, any>
  ) {
    console.log('set cookie:', setCookieHeaders);
    const ret = result ?? {};
    for (const header of setCookieHeaders) {
      const pairs = header.split(';');

      const kv = pairs[0].split('=');
      ret[kv[0]] = kv[1] ?? true;

      for (const pair of header.split(';').slice(1)) {
        const kv = pair.split('=');
        if (kv[0].toLowerCase() === 'domain' && kv[1] !== '.alipay.com') {
          throw 'invalid set cookie header';
        }
      }
    }
    console.log('cookies from server: ', ret);
    HostContext.requestContext.cookie = ret;
  }
}

export function login(mail: string) {
  const instance = new Request({
    path: '/api2/account/sign/mail',
    method: 'POST',
  });
  return instance.makeRequest({ mail });
  // return new Promise((res) => {
  //   setTimeout(() => {
  //     res('ok');
  //   }, 5000);
  // });
}

export async function authCode(code: string, mail: string): Promise<IUserInfo> {
  const instance = new Request({
    path: '/api2/account/authCode',
    method: 'POST',
  });
  const res = await instance.makeRequest({ mail, code });
  return JSON.parse(res).data;
}
