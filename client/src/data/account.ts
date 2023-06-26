import { expireCookies } from '@request/cookie';
import { OASIS_TOKEN_COOKIE_NAME } from '@/constants';

export async function isLogin() {
  const cookieContent = await expireCookies();
  return !!cookieContent[OASIS_TOKEN_COOKIE_NAME];
}
