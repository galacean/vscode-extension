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
import { fsUri2MemUriInfo, getParentUri, isScript, openTexDoc } from '@/utils';
import { URI_QUERY_CREATE_LOCALLY, URI_QUERY_EDIT_LOCALLY } from '@/constants';
import { getProjectListTreeViewProvider } from '@/views/projectView';

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

  workspace.onDidCreateFiles(async (e) => {
    for (const file of e.files) {
      if (isScript(file)) {
        console.log('file create: ', file.toString());
        const fsProvider = getProjectFSProvider();
        const memUri = fsUri2MemUriInfo(file).memUri;
        await fsProvider.writeFile(
          memUri.with({ query: URI_QUERY_CREATE_LOCALLY }),
          await workspace.fs.readFile(file),
          {
            create: true,
            overwrite: true,
          }
        );
        getProjectListTreeViewProvider().refresh(getParentUri(memUri), true);
      }
    }
  });

  workspace.onDidDeleteFiles((e) => {
    for (const uri of e.files) {
      if (isScript(uri)) {
        console.log('delete file: ', uri);
        const fsProvider = getProjectFSProvider();
        const memUri = fsUri2MemUriInfo(uri).memUri;

        if (fsProvider.getFileInfo(memUri)) {
          fsProvider.delete(memUri, { recursive: true });
        }
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
        fsProvider.writeFile(
          memUri.with({ query: URI_QUERY_EDIT_LOCALLY }),
          localContent,
          {
            create: false,
            overwrite: true,
          }
        );
        console.log(uri.toString(), ' change!');
      });
    }
  );
}
