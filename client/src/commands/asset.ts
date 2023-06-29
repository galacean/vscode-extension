import { ExtensionContext, Uri, commands, window, workspace } from 'vscode';

export function CommandAssetShow(context: ExtensionContext) {
  return commands.registerCommand('galacean.asset.show', async (uri: Uri) => {
    const doc = await workspace.openTextDocument(uri);
    window.showTextDocument(doc);
  });
}
