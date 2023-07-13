import { FileSystemWatcher, Uri, workspace } from 'vscode';

export class FSWatcherManager {
  static _watcherMap: Map<string, FSWatcherManager> = new Map();

  watcher: FileSystemWatcher;
  private constructor(
    ...args: Parameters<typeof workspace.createFileSystemWatcher>
  ) {
    this.watcher = workspace.createFileSystemWatcher(...args);
  }

  static create(
    id: string,
    ...args: Parameters<typeof workspace.createFileSystemWatcher>
  ) {
    if (this._watcherMap.get(id)) return this._watcherMap.get(id);
    const watcher = new FSWatcherManager(...args);
    this._watcherMap.set(id, watcher);
    return watcher;
  }

  static dispose(id: string) {
    const fsWatcher = this._watcherMap.get(id);
    if (fsWatcher) {
      fsWatcher.watcher.dispose();
      this._watcherMap.delete(id);
    }
  }

  static disposeAll() {
    for (const id of this._watcherMap.keys()) {
      this.dispose(id);
    }
  }
}
