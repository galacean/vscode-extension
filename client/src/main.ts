import { ExtensionContext, window } from 'vscode';
import Client from './client';

export function activate(context: ExtensionContext) {
  window.showInformationMessage('hello from galacean');
  Client.create(context);
}

export function deactivate(): Thenable<void> | undefined {
  return Client.getClient().deactivate();
}
