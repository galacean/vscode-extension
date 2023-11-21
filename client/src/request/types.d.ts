type IResponse<T> = ISuccessResponse<T> | IFailedResponse;

interface IFailedResponse<T = any> {
  data?: any;
  success: false;
  message?: string;
  errCode?: string;
}

interface ISuccessResponse<T> {
  data: T;
  success: true;
  traceId: string;
}

interface IUserInfo {
  id: string;
  mail: string;
  name: string;
  avatar: string;
  last_login: string;
}
