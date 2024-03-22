import { SERVER_HOST, SERVER_PORT } from '../constants';
import { StatusBarItem, workspace } from 'vscode';
import ContextUtils from './ContextUtils';
import RequestContext from './RequestContext';
import UserContext from './UserContext';
import UIController from '../controllers/UIController';
import ProjectListViewProvider from '../providers/viewData/ProjectListViewProvider';
import Project from '../models/Project';
import { basename, join } from 'path';
import { existsSync } from 'fs';

export default class HostContext {
  private static _singleton: HostContext;

  static init(statusBar: StatusBarItem, assetSyncStatusBar: StatusBarItem) {
    this._singleton = new HostContext(statusBar, assetSyncStatusBar);
  }

  static get instance() {
    if (!this._singleton) {
      throw 'host context not initialized.';
    }
    return this._singleton;
  }

  static get userId() {
    return this.userContext.userId;
  }

  static get requestContext() {
    return this.instance.requestContext;
  }

  static get userContext() {
    return this.instance.userContext;
  }

  static get serverHostAndPort() {
    return this.instance.serverHostAndPort;
  }

  static async isInGalaceanProject() {
    if (!workspace.workspaceFolders) return;

    const workspaceRoot = workspace.workspaceFolders[0].uri;
    if (!existsSync(join(workspaceRoot.path, Project._metaDirName))) return;

    const projectId = basename(workspaceRoot.path);
    return projectId;
  }

  private envConfig: IHostEnv;

  private get serverHostAndPort(): { hostname: string; port: number } {
    const configEnv = <string>this.getConfig('server.env');
    if (!configEnv) return { hostname: SERVER_HOST, port: SERVER_PORT };
    switch (configEnv) {
      case 'dev':
        return { hostname: 'localhost', port: 8443 };
      case 'test':
        return { hostname: 'oasisbe.test.alipay.net', port: 443 };
      case 'pre':
        return { hostname: 'oasisbe-pre.alipay.com', port: 443 };
      default:
        throw `unknown env ${configEnv}`;
    }
  }

  requestContext: RequestContext;
  userContext: UserContext;

  private constructor(
    statusBar: StatusBarItem,
    assetSyncStatusBar: StatusBarItem
  ) {
    this.envConfig = ContextUtils.loadEnv();
    this.requestContext = new RequestContext(
      this.envConfig.cookies,
      ContextUtils.updateEnv.bind(null, this.envConfig)
    );
    const uiContext = new UIController(
      statusBar,
      assetSyncStatusBar,
      ProjectListViewProvider.instance
    );
    this.userContext = new UserContext(uiContext);
  }

  getConfig<T>(key: string) {
    return workspace
      .getConfiguration('galacean', workspace.workspaceFolders?.[0].uri)
      .get<T>(key);
  }

  isLogin() {
    return !!this.envConfig.cookies.OasisToken;
  }
}
