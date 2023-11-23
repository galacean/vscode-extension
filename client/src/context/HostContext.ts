import { SERVER_HOST, SERVER_PORT } from '../constants';
import { StatusBarItem, TreeView, Uri, workspace } from 'vscode';
import ContextUtils from './ContextUtils';
import RequestContext from './RequestContext';
import UserContext from './UserContext';
import UIController from '../controllers/UIController';
import ProjectListViewProvider from '../providers/ProjectListViewProvider';

export default class HostContext {
  private static _singleton: HostContext;

  static init(statusBar: StatusBarItem, projectListView: TreeView<any>) {
    this._singleton = new HostContext(statusBar, projectListView);
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

  static get serverHost() {
    return this.instance.serverHost;
  }

  static get serverPort() {
    return this.instance.serverPort;
  }

  private envConfig: IHostEnv;

  private get serverHost() {
    return this.envConfig.host ?? SERVER_HOST;
  }

  private get serverPort() {
    return this.envConfig.port ?? SERVER_PORT;
  }

  requestContext: RequestContext;
  userContext: UserContext;

  private constructor(
    statusBar: StatusBarItem,
    projectListView: TreeView<any>
  ) {
    this.envConfig = ContextUtils.loadEnv();
    this.requestContext = new RequestContext(
      this.envConfig.cookies,
      ContextUtils.updateEnv.bind(null, this.envConfig)
    );
    const uiContext = new UIController(
      statusBar,
      projectListView,
      ProjectListViewProvider.instance
    );
    this.userContext = new UserContext(uiContext);
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
