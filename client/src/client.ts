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
import { fetchProjectList, fetchUserInfo } from './request';
import ProjectListViewProvider from './providers/ProjectListViewProvider';
import Project from './models/Project';

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
      // synchronize: {
      //   // Notify the server about file changes to '.clientrc files contained in the workspace
      //   fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
      // },
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

  private async initViews(context: ExtensionContext) {
    const statusBar = window.createStatusBarItem(StatusBarAlignment.Left, 100);
    const projectListView = window.createTreeView('project-list', {
      treeDataProvider: ProjectListViewProvider.instance,
      canSelectMany: false,
    });
    projectListView.message = 'click on the project you want to inspect';
    projectListView.title = 'Project List';

    HostContext.init(statusBar, projectListView);
    context.subscriptions.push(statusBar);
    if (HostContext.instance.isLogin()) {
      const [userInfo, projectList] = await window.withProgress(
        { location: { viewId: 'project-list' }, title: 'logging in' },
        () => {
          return Promise.all([fetchUserInfo(), fetchProjectList()]);
        }
      );
      HostContext.userContext.userInfo = userInfo;
      HostContext.userContext.projectList = projectList.map(
        (item) => new Project(item)
      );
    }
  }

  private constructor(context: ExtensionContext) {
    this.initClient(context);
    this.initViews(context);
    this.registerProviders(context);

    Commands.forEach((command) => {
      context.subscriptions.push(
        commands.registerCommand(command.name, command.callback.bind(command))
      );
    });
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
  }
}
