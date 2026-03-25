import { ExtensionContext } from 'vscode';
import Client from './client';

export function activate(context: ExtensionContext) {
  Client.create(context);
}

export function deactivate(): Thenable<void> | undefined {
  return Client.getClient().deactivate();
}
