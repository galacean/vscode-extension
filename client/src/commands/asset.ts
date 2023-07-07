import { getProjectFSProvider } from '@/TextDocProvider';
import { getParentUri, getTemplate } from '@/utils';
import { getProjectListTreeViewProvider } from '@/views/projectView';
import { ProjectListDataChangeEvent } from '@data/project';
import path = require('path');
import {
  ExtensionContext,
  ProgressLocation,
  Uri,
  commands,
  window,
  workspace,
} from 'vscode';

async function createAsset(assetType: 'script' | 'shader') {
  const fsProvider = getProjectFSProvider();
  const currentDir = fsProvider.currentDir;
  if (!currentDir) {
    window.showWarningMessage(
      'select the project which asset will be added against'
    );
    return;
  }
  let fileName =
    assetType === 'script'
      ? `script_${Date.now()}.ts`
      : `water_${Date.now()}.shader`;
  const newUri = Uri.joinPath(currentDir, fileName);
  await fsProvider.writeFile(newUri, getTemplate(assetType), {
    create: true,
    overwrite: true,
  });

  // refresh list view
  const listViewDataProvider = getProjectListTreeViewProvider();
  const dirElement = listViewDataProvider.getElementByUri(currentDir);
  ProjectListDataChangeEvent.fire(dirElement);
}

export function CommandAssetShow(context: ExtensionContext) {
  return commands.registerCommand('galacean.asset.show', async (uri: Uri) => {
    const doc = await workspace.openTextDocument(uri);
    window.showTextDocument(doc);
    getProjectFSProvider().currentDir = uri.with({
      path: path.dirname(uri.path),
    });
  });
}

export function CommandAssetSync(context: ExtensionContext) {
  return commands.registerCommand('galacean.update.asset', async () => {
    const fsProvider = getProjectFSProvider();
    fsProvider.syncAsset();
  });
}

export function CommandAddScript(context: ExtensionContext) {
  return commands.registerCommand('galacean.create.script', () => {
    createAsset('script');
  });
}

export function CommandAddShader(context: ExtensionContext) {
  return commands.registerCommand('galacean.create.shader', () => {
    createAsset('shader');
  });
}

export function CommandRename(context: ExtensionContext) {
  return commands.registerCommand(
    'galacean.asset.rename',
    async (item: ITreeViewItem<any, Uri>) => {
      const fsProvider = getProjectFSProvider();
      const newFileName = await window.showInputBox({
        ignoreFocusOut: true,
        title: 'Enter new filename without "/" character',
      });
      if (!newFileName) return;
      if (newFileName.includes('/')) {
        return window.showErrorMessage('invalid filename');
      }
      const newUri = Uri.joinPath(getParentUri(item.uri), newFileName);
      fsProvider.rename(item.uri, newUri, { overwrite: true });
    }
  );
}

export function CommandDelete(context: ExtensionContext) {
  return commands.registerCommand(
    'galacean.asset.delete',
    async (item: ITreeViewItem<any, Uri>) => {
      const fsProvider = getProjectFSProvider();
      fsProvider.delete(item.uri, { recursive: true });
    }
  );
}
