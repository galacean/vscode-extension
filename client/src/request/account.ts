import { request } from './requests';

interface userInfo {
  mail: string;
  name: string;
  avatar: string;
  status: number;
  last_login: Date;
  cdnUsed: number;
  id: number;
}

export async function getUserInfo() {
  return request<userInfo>({
    method: 'GET',
    url: '/api2/account/auth/detail',
  });
}
