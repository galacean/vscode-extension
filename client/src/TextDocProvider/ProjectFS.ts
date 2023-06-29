import { FSSchema } from '@/constants';
import * as path from 'path';
import {
  Disposable,
  Event,
  EventEmitter,
  FileChangeEvent,
  FileStat,
  FileSystemError,
  FileSystemProvider,
  FileType,
  Uri,
} from 'vscode';

class Directory implements FileStat {
  type = FileType.Directory;
  ctime: number;
  mtime: number;
  size: number;
  name: string;
  entries: Map<string, Entry> = new Map();

  constructor(name: string) {
    this.size = 0;
    this.name = name;
    this.ctime = Date.now();
    this.mtime = Date.now();
  }
}

class File implements FileStat {
  type = FileType.File;
  ctime: number;
  mtime: number;
  size: number;
  name: string;
  content: Uint8Array;

  constructor(data: IProjectAsset) {
    this.size = 0;
    this.name = data.name;
    this.ctime = Date.parse(data.gmtCreate);
    this.mtime = Date.parse(data.gmtModified);
  }
}

export type Entry = File | Directory;

class ProjectFSProvider implements FileSystemProvider {
  _fileChangeEventEmitter = new EventEmitter<FileChangeEvent[]>();
  onDidChangeFile: Event<FileChangeEvent[]> =
    this._fileChangeEventEmitter.event;

  private _rootEntry = new Directory('root');
  schema = FSSchema;

  private _uriMap: Map<string, IProject | IProjectAsset> = new Map();
  setUriData(uri: string, data: IProject | IProjectAsset) {
    this._uriMap.set(uri, data);
  }

  watch(
    uri: Uri,
    options: {
      readonly recursive: boolean;
      readonly excludes: readonly string[];
    }
  ): Disposable {
    // TODO: save file changes
    return new Disposable(() => {});
  }

  stat(uri: Uri): FileStat {
    return this._lookup(uri);
  }

  createDirectory(uri: Uri): void {
    const basename = path.basename(uri.path);
    const dirUri = uri.with({ path: path.dirname(uri.path) });
    const parentDir = this._lookup(dirUri);
    if (!(parentDir instanceof Directory)) {
      throw FileSystemError.FileNotADirectory(dirUri);
    }
    const dirInfo = this._uriMap.get(uri.toString());
    const entry = new Directory(dirInfo.name);
    if (parentDir.entries.has(basename)) return;
    parentDir.entries.set(basename, entry);
  }

  readDirectory(
    uri: Uri
  ): [string, FileType][] | Thenable<[string, FileType][]> {
    const dir = this._lookup(uri);
    if (!(dir instanceof Directory)) {
      throw FileSystemError.FileNotADirectory(uri);
    }
    const ret: [string, FileType][] = [];
    for (const [_, child] of dir.entries) {
      ret.push([child.name, child.type]);
    }
    return ret;
  }

  writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { readonly create: boolean; readonly overwrite: boolean }
  ): void | Thenable<void> {
    const basename = path.basename(uri.path);
    const parent = this._lookupParentDirectory(uri);
    let entry = parent.entries.get(basename) as File;
    if (entry) {
      if (!options.overwrite) throw FileSystemError.FileExists(uri);
    } else {
      const fileInfo = this._uriMap.get(uri.toString()) as IProjectAsset;
      entry = new File(fileInfo);
    }

    entry.content = content;
    parent.entries.set(basename, entry);
  }

  readFile(uri: Uri): Uint8Array {
    const file = this._lookup(uri);
    if (!(file instanceof File)) {
      throw FileSystemError.FileIsADirectory(uri);
    }
    return file.content;
  }

  delete(uri: Uri, options: { readonly recursive: boolean }): void {
    const dirUri = uri.with({ path: path.dirname(uri.path) });
    const basename = path.basename(uri.path);
    const parentDir = this._lookup(dirUri) as Directory;
    if (parentDir.entries.has(basename)) {
      throw FileSystemError.FileNotFound(uri);
    }
    parentDir.entries.delete(basename);
  }

  rename(
    oldUri: Uri,
    newUri: Uri,
    options: { readonly overwrite: boolean }
  ): void {
    const entry = this._lookup(oldUri);
    const oldParent = this._lookupParentDirectory(oldUri);

    const newParent = this._lookupParentDirectory(newUri);
    const newName = path.posix.basename(newUri.path);

    oldParent.entries.delete(entry.name);
    entry.name = newName;
    newParent.entries.set(newName, entry);
  }

  private _lookup(uri: Uri): Entry {
    const parts = uri.path.split('/');
    let cur: Entry = this._rootEntry;
    for (const p of parts) {
      if (!p) continue;
      if (cur instanceof Directory) {
        cur = cur.entries.get(p);
      } else {
        throw FileSystemError.FileNotFound(uri);
      }
    }

    return cur;
  }

  private _lookupParentDirectory(uri: Uri): Directory {
    const dirname = uri.with({ path: path.posix.dirname(uri.path) });
    const ret = this._lookup(dirname);
    if (!(ret instanceof Directory)) {
      throw FileSystemError.FileNotADirectory(dirname);
    }
    return ret;
  }
}

let _FSProvider: ProjectFSProvider;
export function getProjectFSProvider(): ProjectFSProvider {
  if (!_FSProvider) {
    _FSProvider = new ProjectFSProvider();
  }
  return _FSProvider;
}
