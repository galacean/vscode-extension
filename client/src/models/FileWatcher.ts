import {
  FileSystemWatcher,
  ProgressLocation,
  Uri,
  window,
  workspace,
} from 'vscode';
import HostContext from '../context/HostContext';
import { debounceAsync, deleteAsset, updateAssetContent } from '../utils';
import { dirname } from 'path';

const debouncedUpdate = debounceAsync(2000, updateAssetContent);

export default class FileWatcher {
  private static _singleton: FileWatcher;

  static init() {
    if (!this._singleton) {
      this._singleton = new FileWatcher();
    }
  }

  static get fsWatcher() {
    this.init();
    return this._singleton._fsWatcher;
  }

  private _fsWatcher: FileSystemWatcher;

  private constructor() {
    workspace.onDidRenameFiles((e) => {
      for (const f of e.files) {
        const asset = this.getAsset(f.oldUri);
        if (!asset) continue;
        const newDir = dirname(f.newUri.path);
        let newDirAssetUUID;
        if (newDir !== dirname(f.oldUri.path)) {
          if (newDir === HostContext.userContext.openedProject.getLocalPath()) {
            newDirAssetUUID = null;
          } else {
            const newDirAsset = this.getAsset(Uri.file(newDir));
            newDirAssetUUID = newDirAsset.data.uuid;
          }
        }

        asset.rename(f.newUri, newDirAssetUUID);
      }
    });

    workspace.onDidDeleteFiles((e) => {
      for (const f of e.files) {
        this.onDelete(f);
      }
    });

    workspace.onDidSaveTextDocument((e) => {
      const asset = this.getAsset(e.uri);
      if (asset) {
        window.withProgress(
          {
            location: ProgressLocation.Notification,
            title: 'Syncing assets...',
          },
          async () => {
            await debouncedUpdate(asset);
            window.showInformationMessage(`update ${asset.fullName} success`);
          }
        );
      }
    });
  }

  onDelete(uri: Uri) {
    const asset = this.getAsset(uri);
    if (asset) {
      deleteAsset(asset).then(() =>
        window.showInformationMessage(`delete ${asset.fullName} success`)
      );
    }
  }

  getAsset(uri: Uri) {
    return HostContext.userContext.openedProject.findAssetByLocalPath(uri.path);
  }
}
