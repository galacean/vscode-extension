import { ExtensionContext, Range, TextEdit, languages, window } from 'vscode';
import Client from './client';
import { FormatterProvider } from './providers/Formatter';

export function activate(context: ExtensionContext) {
  window.showInformationMessage('hello from galacean');
  Client.create(context);
}

export function deactivate(): Thenable<void> | undefined {
  return Client.getClient().deactivate();
}
