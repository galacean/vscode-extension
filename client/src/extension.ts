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
import {
  CommandProjectClick,
  CommandUpdateProjectList,
} from './commands/project';
import {
  CommandAddScript,
  CommandAddShader,
  CommandAssetShow,
  CommandAssetSync,
  CommandDelete,
  CommandRename,
} from './commands/asset';
import { getProjectFSProvider } from '@/TextDocProvider';
import { NF_SERVER_SHOW_CODE } from './constants';
import { previewCode } from './views/glslCodeView';
import { CommandShowGLSL } from './commands/shader';

let client: LanguageClient;

function initClient(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath('server/out/server.js');
  const serverOpts: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };
  const clientOpts: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'gshader' },
      { scheme: getProjectFSProvider().schema, language: 'gshader' },
    ],
  };

  client = new LanguageClient(
    'galacean-vs-server',
    'Galacean Server',
    serverOpts,
    clientOpts
  );

  client.onNotification(NF_SERVER_SHOW_CODE, (e) => {
    previewCode(e.subShaders[0]);
  });

  client.start();
}

export async function activate(context: ExtensionContext) {
  console.log('galacean plugin activated!');

  const fsProvider = getProjectFSProvider();
  context.subscriptions.push(
    workspace.registerFileSystemProvider(fsProvider.schema, fsProvider)
  );

  initClient(context);

  context.subscriptions.push(CommandStorage(context));
  context.subscriptions.push(CommandStorageSet(context));
  context.subscriptions.push(CommandSignin(context));
  context.subscriptions.push(CommandUpdateProjectList(context));
  context.subscriptions.push(CommandAssetShow(context));
  context.subscriptions.push(CommandAssetSync(context));
  context.subscriptions.push(CommandAddScript(context));
  context.subscriptions.push(CommandProjectClick(context));
  context.subscriptions.push(CommandAddShader(context));
  context.subscriptions.push(CommandShowGLSL(client));
  context.subscriptions.push(CommandRename(context));
  context.subscriptions.push(CommandDelete(context));

  initProjectView(context);

  initUserStatusBar(context);
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
