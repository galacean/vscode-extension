import {
  ExtensionContext,
  RelativePattern,
  Uri,
  commands,
  workspace,
} from 'vscode';
import { FSWatcherManager } from '@/LocalProjectManager/FSWatcher';
import { LocalProjectManager } from '@/LocalProjectManager';
import { getProjectFSProvider } from '@/FSDocProvider';
import * as path from 'path';
import * as fs from 'fs';

export function CommandScriptEdit(context: ExtensionContext) {
  return commands.registerCommand(
    'galacean.script.edit',
    async (item: ITreeViewItem<any, Uri>) => {
      const projectUri = item.uri.with({ path: path.dirname(item.uri.path) });
      await LocalProjectManager.openProjectLocally(projectUri);

      commands.executeCommand('galacean.asset.show', item.uri);
      FSWatcherManager.disposeAll();
      const projectInfo = LocalProjectManager.getProjectInfo(projectUri);
      const fsWatcherManager = FSWatcherManager.create(
        'galacean.project',
        new RelativePattern(
          Uri.joinPath(projectInfo.localTempUri, 'src'),
          '**/*.ts'
        )
      );
      fsWatcherManager.watcher.onDidChange(async (uri) => {
        const regex = /.+\/galacean\/([^\/]+)\/src\/(.+)/;
        const result = uri.path.match(regex);
        const projectId = result[1];
        const path = result[2];

        const fsProvider = getProjectFSProvider();
        const memUri = Uri.joinPath(fsProvider.rootUri, projectId, path);
        const localContent = await workspace.fs.readFile(uri);
        fsProvider.writeFile(memUri, localContent, {
          create: false,
          overwrite: true,
        });
        console.log(uri.toString(), ' change!');
      });
    }
  );
}
