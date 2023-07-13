import {
  ExtensionContext,
  FileChangeType,
  TabInputText,
  Uri,
  commands,
  window,
} from 'vscode';
import { getProjectFSProvider } from '@/FSDocProvider';
import path = require('path');

export function CommandUpdateProjectList(context: ExtensionContext) {
  return commands.registerCommand(
    'galacean.update.project.list',
    async (event?: ITreeViewItem<any, Uri>) => {
      const fsProvider = getProjectFSProvider();
      if (fsProvider.dirtyAssets.length > 0) {
        const selection = await window.showWarningMessage(
          'There are uncommitted content, please upload and synchronize uncommitted content first or force refresh (uncommitted content will be discarded)',
          'Cancel',
          'Force Refresh'
        );
        if (selection === 'Cancel') return;
      }

      if (!event) {
        fsProvider.clearCache();
        fsProvider.init();
      }

      fsProvider._fileChangeEventEmitter.fire([
        { type: FileChangeType.Changed, uri: event?.uri ?? fsProvider.rootUri },
      ]);
    }
  );
}

export function CommandProjectClick(context: ExtensionContext) {
  return commands.registerCommand('galacean.project.click', (uri: Uri) => {
    getProjectFSProvider().currentDir = uri;
  });
}
