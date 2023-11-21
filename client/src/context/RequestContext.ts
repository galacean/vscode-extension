/**
 * 请求相关上下文
 */
export default class RequestContext {
  private _dirtyFlag = true;
  private _string = '';

  private _cookie: ICookie;
  get cookie() {
    return this._cookie;
  }

  set cookie(cookie: ICookie) {
    Object.assign(this._cookie, cookie);
    this._dirtyFlag = true;
    this.updateCb?.();
  }

  private updateCb: () => void;

  constructor(cookie: ICookie, updateCb: () => void) {
    this._cookie = cookie;
    if (!this._cookie.ctoken) {
      this._cookie.ctoken = 'from_vscode';
    }
    this.updateCb = updateCb;
  }

  toString() {
    if (this._dirtyFlag) {
      const pair: string[] = [];
      for (const key in this._cookie) {
        if (this._cookie[key] === true) {
          pair.push(key);
        } else {
          pair.push(`${key}=${this._cookie[key]}`);
        }
      }
      this._string = pair.join(';');
      this._dirtyFlag = false;
    }

    return this._string;
  }
}
