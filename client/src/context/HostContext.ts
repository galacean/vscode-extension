import { ENV_PATH, SERVER_HOST, SERVER_PORT } from '../constants';
import { Uri, window, workspace } from 'vscode';
import ContextUtils from './ContextUtils';
import RequestContext from './RequestContext';

export default class HostContext {
  private static _singleton: HostContext;

  static get instance() {
    if (!this._singleton) {
      this._singleton = new HostContext();
    }
    return this._singleton;
  }

  static get requestContext() {
    return this.instance.requestContext;
  }

  static get serverHost() {
    return this.instance.serverHost;
  }

  static get serverPort() {
    return this.instance.serverPort;
  }

  private envConfig: IHostEnv;

  private cacheRootUri: Uri;

  private get serverHost() {
    return this.envConfig.host ?? SERVER_HOST;
  }

  private get serverPort() {
    return this.envConfig.port ?? SERVER_PORT;
  }

  requestContext: RequestContext;

  private _userInfo: IUserInfo;

  get userInfo() {
    return this._userInfo;
  }

  set userInfo(info: IUserInfo) {
    this._userInfo = info;
    // TODO: update ui
  }

  private constructor() {
    this.envConfig = ContextUtils.loadEnv();
    this.requestContext = new RequestContext(
      this.envConfig.cookies,
      ContextUtils.updateEnv.bind(null, this.envConfig)
    );

    this.cacheRootUri = Uri.file(this.getConfig('root'));
  }

  getConfig<T>(key: string) {
    return workspace
      .getConfiguration('galacean', workspace.workspaceFolders[0].uri)
      .get<T>(key);
  }

  isLogin() {
    return !!this.envConfig.cookies.OasisToken;
  }
}
