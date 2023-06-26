import { ExtensionContext, commands, window } from 'vscode';
import { GLOBAL_KEY_TEST } from './constants';

export function CommandStorage(context: ExtensionContext) {
  return commands.registerCommand('galacean.storageCheck', () => {
    const v = context.globalState.get(GLOBAL_KEY_TEST);
    window.showInformationMessage(`keys: ${v}`);
  });
}

export function CommandStorageSet(context: ExtensionContext) {
  return commands.registerCommand('galacean.storageSet', () => {
    const v = Math.random();
    context.globalState.update(GLOBAL_KEY_TEST, v).then(() => {
      window.showInformationMessage(`saved: ${v}`);
    });
  });
}
