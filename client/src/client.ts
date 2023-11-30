import * as path from 'path';
import {
  ExtensionContext,
  languages,
  commands,
  window,
  StatusBarAlignment,
} from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { SHADER_LAG_ID } from './constants';
import { FormatterProvider } from './providers/Formatter';
import { EditorPropertiesCompletionProvider } from './providers/EditorPropertiesCompletionProvider';
import { Commands } from './commands';
import HostContext from './context/HostContext';
import { fetchProjectList, fetchUserInfo } from './utils/request';
import ProjectListViewProvider from './providers/viewData/ProjectListViewProvider';
import Project from './models/Project';
import SimpleCompletionItemProvider from './providers/CompletionProvider';
import LocalFileManager from './models/LocalFileManager';
import AssetSourceController from './controllers/AssetSourceController';

let _singleton: Client;
const selector = { language: 'shaderlab' };

export default class Client {
  _instance: LanguageClient;

  static getClient() {
    if (!_singleton) throw 'not initialized';
    return _singleton;
  }

  static create(context: ExtensionContext) {
    _singleton = new Client(context);
    return _singleton;
  }

  private constructor(context: ExtensionContext) {
    this.initClient(context);
    this.registerProviders(context);
    this.initViews(context);
    Commands.forEach((command) => {
      context.subscriptions.push(
        commands.registerCommand(command.name, command.callback.bind(command))
      );
    });

    this.initUserContext(context);
  }

  private async initUserContext(context: ExtensionContext) {
    const userContext = HostContext.userContext;
    if (!HostContext.instance.isLogin()) return false;

    await window.withProgress(
      { location: { viewId: 'project-list' } },
      async () => {
        // user
        if (LocalFileManager.existUser()) {
          userContext.userInfo = await LocalFileManager.readUserInfoFromLocal();
        } else {
          userContext.userInfo = await fetchUserInfo();
        }

        // project list
        if (!LocalFileManager.existUserProjectList()) {
          const projectList = await fetchProjectList();
          userContext.projectList = projectList.map(
            (item) => new Project(item)
          );
        } else {
          userContext.projectList =
            await LocalFileManager.readUserProjectListFromLocal();
        }

        // opened project
        const openedProjectId = await HostContext.isInGalaceanProject();
        if (openedProjectId) {
          const project = userContext.getProjectById(openedProjectId);
          if (project) {
            await project.initAssets();
            userContext.openedProject = project;

            AssetSourceController.init(context);
          }
        }
      }
    );

    return true;
  }

  private initClient(context: ExtensionContext) {
    const serverModule = context.asAbsolutePath(
      path.join('server', 'out', 'main.js')
    );

    const serverOptions: ServerOptions = {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
      },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ scheme: 'file', language: SHADER_LAG_ID }],
    };

    const client = new LanguageClient(
      'languageServerExample',
      'Language Server Example',
      serverOptions,
      clientOptions
    );

    client.start();
    this._instance = client;
  }

  private initViews(context: ExtensionContext) {
    const statusBar = window.createStatusBarItem(StatusBarAlignment.Left, 100);
    const projectListView = window.createTreeView('project-list', {
      treeDataProvider: ProjectListViewProvider.instance,
      canSelectMany: false,
    });
    context.subscriptions.push(projectListView);
    projectListView.message = 'click on the project you want to inspect';
    projectListView.title = 'Project List';

    HostContext.init(statusBar);
    context.subscriptions.push(statusBar);
  }

  deactivate(): Thenable<void> | undefined {
    return this._instance.stop();
  }

  private registerProviders(context: ExtensionContext) {
    context.subscriptions.push(
      languages.registerDocumentRangeFormattingEditProvider(
        selector,
        new FormatterProvider()
      )
    );

    context.subscriptions.push(
      languages.registerCompletionItemProvider(
        selector,
        new EditorPropertiesCompletionProvider()
      )
    );

    context.subscriptions.push(
      languages.registerCompletionItemProvider(
        selector,
        new SimpleCompletionItemProvider()
      )
    );
  }
}
