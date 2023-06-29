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
import { initProjectView, initUserStatusBar } from './views/projectView';
import { CommandUpdateProjectList } from './commands/project';
import { CommandAssetShow } from './commands/asset';
import { HttpTextDocProvider } from './TextDocProvider';
import { getProjectFSProvider } from '@/TextDocProvider';

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

export async function activate(context: ExtensionContext) {
  console.log('galacean plugin activated!');

  const fsProvider = getProjectFSProvider();
  context.subscriptions.push(
    workspace.registerFileSystemProvider(fsProvider.schema, fsProvider)
  );
  // context.subscriptions.push(
  //   workspace.registerTextDocumentContentProvider(
  //     'asset',
  //     new HttpTextDocProvider()
  //   )
  // );
  context.subscriptions.push(CommandStorage(context));
  context.subscriptions.push(CommandStorageSet(context));
  context.subscriptions.push(CommandSignin(context));
  context.subscriptions.push(CommandUpdateProjectList(context));
  context.subscriptions.push(CommandAssetShow(context));
  initClient(context);

  initProjectView(context);
  initUserStatusBar(context);
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
