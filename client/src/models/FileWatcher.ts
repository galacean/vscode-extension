import { FileSystemWatcher, Uri, window, workspace } from 'vscode';
import HostContext from '../context/HostContext';
import { debounceAsync, deleteAsset, updateAsset } from '../utils';

const debouncedUpdate = debounceAsync(2000, updateAsset);

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
  private _ignoreFiles = new Map<string, boolean>();

  private constructor() {
    this._fsWatcher = workspace.createFileSystemWatcher(
      '**/{*,!node_modules,!.git,!.vscode}/*.{ts,shader}'
    );
    this._fsWatcher.onDidChange(this.onChange.bind(this));

    this._fsWatcher.onDidDelete(this.onDelete.bind(this));
  }

  static addIgnoreFile(path: string) {
    this.init();
    this._singleton._ignoreFiles.set(path, true);
  }

  onChange(uri: Uri) {
    if (this._ignoreFiles.get(uri.path)) {
      this._ignoreFiles.delete(uri.path);
      return;
    }
    const asset = this.getAsset(uri);
    if (!asset) {
      // TODO: 资产创建涉及到设置资产meta相关逻辑，需要明确规则
    } else {
      // 更新
      debouncedUpdate(asset).then(() => {
        window.showInformationMessage(`update ${asset.fullName} success`);
      });
    }
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
