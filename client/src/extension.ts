import path = require('path');
import { window, ExtensionContext, commands, workspace, Uri } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { CommandStorage, CommandStorageSet } from './commands/storage';
import { CommandSignin } from './commands/account';
import { isLogin } from '@data/account';
import { initProjectView, initUserStatusBar } from './views/projectView';
import { CommandUpdateProjectList } from './commands/project';
import { CommandAssetShow } from './commands/asset';

let client: LanguageClient;

function initClient(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath('server/out/server.js');
  const serverOpts: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };
  const clientOpts: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'gshader' }],
  };

  client = new LanguageClient(
    'galacean-vs-server',
    'Galacean Server',
    serverOpts,
    clientOpts
  );
  client.start();
}

export function activate(context: ExtensionContext) {
  console.log('galacean plugin activated!');

  context.subscriptions.push(CommandStorage(context));
  context.subscriptions.push(CommandStorageSet(context));
  context.subscriptions.push(CommandSignin(context));
  context.subscriptions.push(CommandUpdateProjectList(context));
  context.subscriptions.push(CommandAssetShow(context));
  // context.subscriptions.push(CommandFetchUserDetail(context));
  initClient(context);

  if (isLogin()) {
    initProjectView(context);
    initUserStatusBar(context);
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
