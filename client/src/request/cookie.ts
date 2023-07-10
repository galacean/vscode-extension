import * as fs from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Uri, workspace } from 'vscode';
interface ICookie {
  name: string;
  value: string;
  props: Record<string, any>;
}

export type ICookieContent = Record<string, ICookie>;

let _currentCookieDirtyFlag = true;
let _currentCookieContent: ICookieContent;

const _filePath = join(homedir(), '.galacean-vse');
export const COOKIE_FILE = Uri.file(_filePath);

export async function getCookieContent() {
  if (!fs.existsSync(_filePath)) {
    await workspace.fs.writeFile(COOKIE_FILE, Buffer.from('{}'));
  }

  if (_currentCookieDirtyFlag) {
    _currentCookieContent = JSON.parse(
      (await workspace.fs.readFile(COOKIE_FILE)).toString()
    );
    _currentCookieDirtyFlag = false;
  }
  return _currentCookieContent;
}

export async function expireCookies() {
  const allCookie = await getCookieContent();
  let dirty = false;
  for (const cookieName in allCookie) {
    const cookie = allCookie[cookieName];
    if (cookie.props.expires && Date.now() > Date.parse(cookie.props.expires)) {
      dirty = true;
      delete allCookie[cookieName];
    }
  }
  if (dirty) {
    await saveCookie({ content: allCookie, persist: true });
  }
  return allCookie;
}

export async function getCookieString() {
  const cookies = await expireCookies();
  return Object.values(cookies)
    .map((cookie) => {
      return `${cookie.name}=${cookie.value}`;
    })
    .join(';');
}

export function parseSetCookie(header: string): ICookie {
  const cookie = { props: {} } as ICookie;
  const pairList = header.split(';');
  const [name, value] = pairList[0].split('=');
  cookie.name = name;
  cookie.value = value;
  for (const pair of pairList.slice(1)) {
    const [k, v] = pair.split('=');
    cookie.props[k] = v?.trim() ?? true;
  }
  return cookie;
}

export async function saveCookie(opts?: {
  cookie?: ICookie;
  content?: ICookieContent;
  persist?: boolean;
}): Promise<ICookieContent> {
  const content =
    opts?.content ??
    (JSON.parse(
      (await workspace.fs.readFile(COOKIE_FILE)).toString()
    ) as ICookieContent);
  if (opts?.cookie) {
    content[opts.cookie.name] = opts.cookie;
  }
  if (opts.persist && (opts.content || opts.cookie)) {
    if (Object.keys(content).length === 0) {
      debugger;
    }
    await workspace.fs.writeFile(
      COOKIE_FILE,
      Buffer.from(JSON.stringify(content))
    );
    _currentCookieDirtyFlag = true;
  }
  return content;
}
