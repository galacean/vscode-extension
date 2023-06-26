import { requestInstance } from './requests';
export * from './account';

export async function signinByMail(mail: string) {
  const res = await requestInstance.post('/api2/account/sign/mail', { mail });
  console.log('sign response: ', res);
}

export async function codeVerification(code: string, mail: string) {
  return requestInstance.post('/api2/account/authCode', { code, mail });
}
