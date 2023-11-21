type ICookie = {
  OasisToken?: string;
  ctoken?: string;
} & Record<string, any>;

interface IHostEnv {
  /** 本地缓存cookie*/
  cookies: ICookie;

  /** server host */
  host: string;

  /** server port */
  port: number;
}
