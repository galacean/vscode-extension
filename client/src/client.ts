import * as path from 'path';
import {
  ExtensionContext,
  languages,
  commands,
  window,
  StatusBarAlignment,
  ProgressLocation,
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
import URIHandler from './providers/URIHandler';
import FileWatcher from './models/FileWatcher';
import PullProjectAssets from './commands/PullProjectAssets';
import NpmInstall from './commands/NpmInstall';
import { existsSync } from 'fs';

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
      { location: ProgressLocation.Notification },
      async () => {
        // user
        if (LocalFileManager.existUser()) {
          userContext.userInfo = await LocalFileManager.readUserInfoFromLocal();
        } else {
          userContext.userInfo = await fetchUserInfo();
        }

        // project list
        if (!LocalFileManager.existUserProjectList()) {
          const projectList = await fetchProjectList(0, 10);
          userContext.projectList = projectList.list.map(
            (item) => new Project(item)
          );
        } else {
          userContext.projectList =
            await LocalFileManager.readUserProjectListFromLocal();
        }

        context.subscriptions.push(FileWatcher.fsWatcher);
        // opened project
        const openedProjectId = await HostContext.isInGalaceanProject();
        if (openedProjectId) {
          const project = userContext.getProjectById(openedProjectId);
          if (project) {
            await project.initAssets();
            userContext.openedProject = project;

            if (
              !existsSync(path.join(project.getLocalPath(), 'node_modules'))
            ) {
              commands.executeCommand(NpmInstall.command);
            }
          }
        }
      }
    );

    FileWatcher.init();
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
    const assetSyncStatusBar = window.createStatusBarItem(
      StatusBarAlignment.Left,
      99
    );
    assetSyncStatusBar.command = PullProjectAssets.command;
    assetSyncStatusBar.hide();

    const projectListView = window.createTreeView('project-list', {
      treeDataProvider: ProjectListViewProvider.instance,
      canSelectMany: false,
    });
    context.subscriptions.push(projectListView);

    HostContext.init(statusBar, assetSyncStatusBar);
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

    context.subscriptions.push(window.registerUriHandler(new URIHandler()));
  }
}
