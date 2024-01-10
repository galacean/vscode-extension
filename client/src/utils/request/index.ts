import * as https from 'https';
import { IncomingMessage, ClientRequest } from 'http';
import HostContext from '../../context/HostContext';
import * as FormData from 'form-data';
import Asset from '../../models/Asset';
import { commands, window } from 'vscode';

export default class Request {
  options: https.RequestOptions;

  constructor(
    options?: Omit<https.RequestOptions, 'headers'>,
    headers?: Record<string, any>
  ) {
    this.options = {
      headers: {
        'content-type': 'application/json',
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
          if (!success) {
            const errRes = JSON.parse(body) as IFailedResponse;
            if (errRes.errCode === 10001) {
              window.showErrorMessage('Session expired! please log in again.');
              commands.executeCommand('galacean.login');
            }
          }
          success ? resolve(body) : reject(body);
        });
      };

      let req: ClientRequest;

      if (data instanceof FormData) {
        req = data.submit(
          {
            ...this.options,
            headers: {
              ...this.options.headers,
              ...(<FormData>data).getHeaders(),
            },
            protocol: 'https:',
          },
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
}

export async function authCode(code: string, mail: string): Promise<IUserInfo> {
  const instance = new Request({
    path: '/api2/account/authCode',
    method: 'POST',
  });
  const res = await instance.makeRequest({ mail, code });
  return JSON.parse(res).data;
}

export async function fetchUserInfo(): Promise<IUserInfo> {
  const instance = new Request({ path: '/api2/account/auth/detail' });
  const res = await instance.makeRequest();
  return JSON.parse(res).data;
}

export async function fetchProjectList(
  pageNo: number,
  pageSize: number
): Promise<IPaginationResponse<IProject>> {
  const instance = new Request({
    path: `/api/project/list?pageSize=${pageSize}&pageNo=${pageNo}`,
  });
  const res = JSON.parse(await instance.makeRequest()) as ISuccessResponse<
    IPaginationResponse<IProject>
  >;
  return res.data;
}

export async function fetchProjectDetail(
  projectId: string
): Promise<IProjectDetail> {
  const instance = new Request({ path: `/api/project/detail/${projectId}` });
  const res = JSON.parse(
    await instance.makeRequest()
  ) as ISuccessResponse<IProjectDetail>;
  return res.data;
}

export async function updateAsset(asset: Asset, content: Buffer) {
  const instance = new Request({
    path: '/api/project/asset/form/update',
    method: 'POST',
  });
  const form = new FormData();
  form.append('id', asset.data.id);
  form.append('projectId', asset.project.data.id);
  form.append('file', content, { filename: asset.fullName });
  const res = await instance.makeRequest(form);
  const ret = JSON.parse(res) as ISuccessResponse<IAsset>;
  return ret.data;
}

export async function fetchAssetDetail(
  assetId: string | number
): Promise<IAsset> {
  const instance = new Request({
    path: `/api/project/asset/detail/${assetId}`,
    method: 'GET',
  });
  const res = JSON.parse(
    await instance.makeRequest()
  ) as ISuccessResponse<IAsset>;
  return res.data;
}

export async function curl(
  url: string,
  options?: https.RequestOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, options, (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve(body);
      });
    });

    req.on('error', (e) => {
      console.error(e);
      reject(e);
    });
    req.end();
  });
}
