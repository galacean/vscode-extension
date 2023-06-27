import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { window, workspace } from 'vscode';
import {
  ICookieContent,
  getCookieContent,
  getCookieString,
  parseSetCookie,
  saveCookie,
} from './cookie';

interface IServerResponseData<T = any> {
  data?: T;
  errMsg?: string;
  errCode?: number;
  traceId: string;
  success: boolean;
}

type IServerResponse<T = any> = AxiosResponse<IServerResponseData<T>>;
type IServerErrorReponse<T = any> = AxiosError<IServerResponseData<T>>;

const serverSetting = workspace.getConfiguration('galacean.server');

const instance = axios.create({
  baseURL: serverSetting.get('host') ?? 'https://oasisbe.alipay.com',
  headers: { 'x-galacean-platform': 'galacean-vscode-extension' },
});

instance.interceptors.request.use(async (config) => {
  const cookieString = await getCookieString();
  config.headers['Cookie'] = cookieString;

  if (config.method.toLowerCase() === 'post') {
    const cookieContent = await getCookieContent();
    let ctoken = cookieContent['ctoken']?.value;
    if (!ctoken) {
      ctoken = Math.random().toString();
      config.headers['Cookie'] += `;ctoken=${ctoken};`;
    }
    config.headers['x-csrf-token'] = ctoken;
  }
  return config;
});

instance.interceptors.response.use(
  async (response: IServerResponse) => {
    const setCookieList = response.headers['set-cookie'];
    if (setCookieList && setCookieList.length > 0) {
      let cookieContent: ICookieContent | undefined;
      for (const setCookie of setCookieList) {
        const cookie = parseSetCookie(setCookie);
        cookieContent = await saveCookie({ cookie, content: cookieContent });
      }
      saveCookie({
        content: cookieContent,
        persist: cookieContent && Object.keys(cookieContent).length > 0,
      });
    }
    return response;
  },
  (error: IServerErrorReponse) => {
    console.log(error);
    const errMsg = error.response?.data?.errMsg ?? 'request error';
    window.showErrorMessage(errMsg);
    throw error;
  }
);

export { instance as requestInstance };

export function request<T>(config: AxiosRequestConfig) {
  return instance.request<IServerResponseData<T>>(config);
}
