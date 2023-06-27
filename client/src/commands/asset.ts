import { ExtensionContext, Uri, commands, window, workspace } from 'vscode';

export function CommandAssetShow(context: ExtensionContext) {
  return commands.registerCommand('galacean.asset.show', (event) => {
    workspace.openTextDocument(Uri.parse(event.url));
  });
}
