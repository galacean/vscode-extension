import { getProjectFSProvider } from '@/TextDocProvider';
import { getTemplate } from '@/utils';
import { getProjectListTreeViewProvider } from '@/views/projectView';
import { ProjectListDataChangeEvent } from '@data/project';
import {
  ExtensionContext,
  ProgressLocation,
  Uri,
  commands,
  window,
  workspace,
} from 'vscode';

export function CommandAssetShow(context: ExtensionContext) {
  return commands.registerCommand('galacean.asset.show', async (uri: Uri) => {
    const doc = await workspace.openTextDocument(uri);
    window.showTextDocument(doc);
  });
}

export function CommandAssetSync(context: ExtensionContext) {
  return commands.registerCommand('galacean.update.asset', async () => {
    const fsProvider = getProjectFSProvider();
    fsProvider.syncAsset();
  });
}

export function CommandAddScript(context: ExtensionContext) {
  return commands.registerCommand('galacean.create.script', async () => {
    const fsProvider = getProjectFSProvider();
    const currentDir = fsProvider.currentDir;
    if (!currentDir) {
      window.showWarningMessage(
        'select the project which asset will be added against'
      );
      return;
    }
    const newUri = Uri.joinPath(currentDir, `script_${Date.now()}.ts`);
    await fsProvider.writeFile(newUri, getTemplate('script'), {
      create: true,
      overwrite: true,
    });

    // refresh list view
    const listViewDataProvider = getProjectListTreeViewProvider();
    const dirElement = listViewDataProvider.getElementByUri(currentDir);
    ProjectListDataChangeEvent.fire(dirElement);
  });
}
