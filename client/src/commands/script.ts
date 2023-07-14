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
import { fsUri2MemUriInfo, isScript, openTexDoc } from '@/utils';

export function CommandScriptEdit(context: ExtensionContext) {
  workspace.onDidRenameFiles((e) => {
    for (const file of e.files) {
      if (isScript(file.oldUri)) {
        const oldMemUri = fsUri2MemUriInfo(file.oldUri).memUri;
        const newMemUri = fsUri2MemUriInfo(file.newUri).memUri;

        const fsProvider = getProjectFSProvider();
        fsProvider.rename(oldMemUri, newMemUri, { overwrite: true });
      }
    }
  });

  return commands.registerCommand(
    'galacean.script.edit',
    async (item: ITreeViewItem<any, Uri>) => {
      const projectUri = item.uri.with({ path: path.dirname(item.uri.path) });
      const localTempProjectUri = await LocalProjectManager.openProjectLocally(
        projectUri
      );
      openTexDoc(
        Uri.joinPath(localTempProjectUri, 'src', path.basename(item.uri.path))
      );

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
        const memUriInfo = fsUri2MemUriInfo(uri);

        const fsProvider = getProjectFSProvider();
        const memUri = memUriInfo.memUri;
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
