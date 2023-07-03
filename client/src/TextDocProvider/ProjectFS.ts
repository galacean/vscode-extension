import { FSSchema } from '@/constants';
import {
  createAsset,
  fetchProjectAssetList,
  updateProjectAsset,
} from '@/request/project';
import { fetchContentByUrl, hashMD5 } from '@/utils';
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
  window,
} from 'vscode';
import { v4 as uuid4 } from 'uuid';
import { ProjectListDataChangeEvent, getProjectListData } from '@data/project';
import { getProjectListTreeViewProvider } from '@/views/projectView';
import { isLogin } from '@data/account';

export class Directory implements FileStat {
  type = FileType.Directory;
  ctime: number;
  mtime: number;
  size: number;
  name: string;
  entries: Map<string, Entry> = new Map();
  data?: IProject | IProjectAsset;

  constructor(name: string, data?: IProject | IProjectAsset) {
    this.size = 0;
    this.name = name;
    this.ctime = Date.now();
    this.mtime = Date.now();
    this.data = data;
  }
}

class File implements FileStat {
  type = FileType.File;
  ctime: number;
  mtime: number;
  size: number;
  name: string;
  /** Undefined if file is created locally */
  data?: IProjectAsset;

  constructor(name: string, data?: IProjectAsset) {
    this.size = 0;
    this.name = name;
    this.ctime = data ? Date.parse(data.gmtCreate) : Date.now();
    this.mtime = data ? Date.parse(data.gmtModified) : Date.now();
    this.data = data;
  }
}

export type Entry = File | Directory;

interface FileMeta {
  /** Whether need to sync with server or not */
  dirty: boolean;
  /** Newly created */
  created: boolean;
  /** Content hash, for comparing */
  contentHash?: string;
  /** Remote content */
  content?: Uint8Array;
  /** Deleted locally */
  deleted: boolean;
  /** uri */
  dirInfo?: FileInfo;
}

class FileInfo {
  meta: FileMeta;
  file: Entry;

  private constructor(data: Entry, meta: FileMeta) {
    this.file = data;
    this.meta = meta;
  }

  /** fetch remote content */
  async init() {
    if (this.file.type === FileType.File) {
      const assetInfo = this.file.data as IProjectAsset;
      if (assetInfo?.url && !this.meta.content) {
        this.meta.content = await fetchContentByUrl(assetInfo.url);
      }
    }
    return this;
  }

  /**
   * @return if updated
   */
  setContent(content: Uint8Array) {
    const hash = hashMD5(content.toString());
    const needUpdate = hash !== this.meta.contentHash;
    if (needUpdate) {
      this.meta.content = content;
      this.meta.contentHash = hash;
    }
    return needUpdate;
  }

  /** create by server data */
  static from(data: Entry): FileInfo {
    return new FileInfo(data, { dirty: false, created: false, deleted: false });
  }

  /** create locally */
  static create(data: Entry): FileInfo {
    return new FileInfo(data, { dirty: true, created: true, deleted: false });
  }
}

class ProjectFSProvider implements FileSystemProvider {
  _fileChangeEventEmitter = new EventEmitter<FileChangeEvent[]>();
  onDidChangeFile: Event<FileChangeEvent[]> =
    this._fileChangeEventEmitter.event;

  private _rootEntry = new Directory('root');
  schema = FSSchema;
  rootUri = Uri.parse(`${this.schema}:/`);

  private _uriMap: Map<string, FileInfo> = new Map();

  private setUriData(uri: string, info: FileInfo) {
    this._uriMap.set(uri, info);
  }

  private _currentDir: Uri | undefined;

  private _initialized = false;

  get dirtyAssets(): Array<FileInfo> {
    const ret: Array<FileInfo> = [];
    for (const [_, v] of this._uriMap) {
      if (v.meta.dirty) ret.push(v);
    }
    return ret;
  }

  set currentDir(uri: Uri) {
    const fileInfo = this._uriMap.get(uri.toString());
    if (fileInfo?.file.type !== FileType.Directory) {
      throw FileSystemError.FileNotADirectory(uri);
    }
    this._currentDir = uri;
  }

  get currentDir() {
    return this._currentDir;
  }

  get selectedProjectId() {
    if (!this._currentDir) throw FileSystemError.Unavailable();
    const list = this._currentDir.path.split('/');
    return Number(list[list.length - 1]);
  }

  constructor() {
    this.onDidChangeFile((e) => {
      const listViewDataProvider = getProjectListTreeViewProvider();
      for (const event of e) {
        const fileInfo = this.getFileInfo(event.uri);
        if (event.uri.toString() === this.rootUri.toString()) {
          return this.initData(true).then(() => {
            ProjectListDataChangeEvent.fire(
              listViewDataProvider.getElementByUri(event.uri)
            );
          });
        }
        if (fileInfo.file.type === FileType.Directory) {
          this._initProjectListDirectory(fileInfo.file.data as IProject).then(
            () => {
              ProjectListDataChangeEvent.fire(
                listViewDataProvider.getElementByUri(event.uri)
              );
            }
          );
        }
      }
    });
  }

  async _initProjectListDirectory(project: IProject) {
    const uri = Uri.parse(`${this.schema}:/${project.id}`);
    const directory = new Directory(project.name, project);

    const dirInfo = FileInfo.from(directory);
    this.setUriData(uri.toString(), dirInfo);
    this.createDirectory(uri, true);
    return fetchProjectAssetList({ projectId: project.id }).then((res) => {
      const assetList = res.data.data.list;
      return Promise.all(
        assetList.map((asset) => this._initAssetFile(asset, project))
      );
    });
  }

  async _initAssetFile(asset: IProjectAsset, project: IProject) {
    const uri = Uri.parse(`${this.schema}:/${project.id}/${asset.name}`);
    const uriString = uri.toString();

    const file = new File(asset.name, asset);
    const fileInfo = FileInfo.from(file);
    this.setUriData(uriString, fileInfo);
    this.writeFile(uri, Buffer.from(''), {
      create: true,
      overwrite: true,
    });
  }

  /** fetch remote data */
  async initData(force = false) {
    if (!this._initialized || force) {
      const logged = await isLogin();
      if (!logged) return false;

      this._uriMap.clear();
      this.setUriData(this.rootUri.toString(), FileInfo.from(this._rootEntry));

      const projectList = await getProjectListData();
      await Promise.all(
        projectList.map((project) => {
          return this._initProjectListDirectory(project);
        })
      );

      this._initialized = true;
    }
    return this._initialized;
  }

  getFileInfo(uri: Uri | string) {
    return this._uriMap.get(uri.toString());
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
    return this.getFileInfo(uri).file;
  }

  createDirectory(uri: Uri, override = false): void {
    const basename = path.basename(uri.path);
    const dirUri = uri.with({ path: path.dirname(uri.path) });
    let parentDir = this.getFileInfo(dirUri).file as Directory;
    if (parentDir.type !== FileType.Directory) {
      throw FileSystemError.FileNotADirectory(dirUri);
    }

    if (parentDir.entries.has(basename) && !override) {
      throw FileSystemError.FileExists(uri);
    }
    const uriString = uri.toString();

    let dirFileInfo = this.getFileInfo(uriString);
    if (!dirFileInfo) {
      // create locally
      const directory = new Directory(basename);
      dirFileInfo = FileInfo.create(directory);
      this._uriMap.set(uriString, dirFileInfo);
    }

    parentDir.entries.set(basename, dirFileInfo.file);
  }

  readDirectory(uri: Uri): [string, FileType][] {
    if (!this._initialized)
      throw FileSystemError.Unavailable('Not initialized!');

    const dir = this.getFileInfo(uri).file as Directory;
    if (dir.type !== FileType.Directory) {
      throw FileSystemError.FileNotADirectory(uri);
    }
    const ret: [string, FileType][] = [];
    for (const [_, child] of dir.entries) {
      ret.push([child.name, child.type]);
    }

    this._currentDir = uri;
    return ret;
  }

  async writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { readonly create: boolean; readonly overwrite: boolean }
  ): Promise<void> {
    const basename = path.basename(uri.path);
    const parentUri = uri.with({ path: path.posix.dirname(uri.path) });
    const parentInfo = this.getFileInfo(parentUri);
    const parent = parentInfo.file as Directory;
    if (parent.type !== FileType.Directory) {
      throw FileSystemError.FileNotADirectory(parentUri);
    }
    const uriString = uri.toString();

    let fileInfo = this.getFileInfo(uriString);

    if (!fileInfo) {
      // create locally
      const file = new File(basename);
      fileInfo = FileInfo.create(file);
      fileInfo.meta.dirty = fileInfo.setContent(content);
      fileInfo.meta.dirInfo = parentInfo;
    } else if (fileInfo.meta.content) {
      fileInfo.meta.dirty = fileInfo.setContent(content);
    }

    this._uriMap.set(uriString, fileInfo);
    parent.entries.set(uriString, fileInfo.file);
    return;
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    if (!this._initialized)
      throw FileSystemError.Unavailable('Not initialized!');

    const fileInfo = this.getFileInfo(uri);
    const file = fileInfo.file as File;
    if (fileInfo.file.type !== FileType.File) {
      throw FileSystemError.FileIsADirectory(uri);
    }
    if (file.data?.url) {
      const content = await fetchContentByUrl(file.data.url);
      fileInfo.setContent(Buffer.from(content));
    }
    return fileInfo.meta.content;
  }

  delete(uri: Uri, options: { readonly recursive: boolean }): void {
    const dirUri = uri.with({ path: path.dirname(uri.path) });
    const basename = path.basename(uri.path);
    const parentDir = this.getFileInfo(dirUri).file as Directory;
    if (!parentDir.entries.has(basename)) {
      throw FileSystemError.FileNotFound(uri);
    }
    const fileInfo = this.getFileInfo(uri);
    if (!fileInfo) {
      throw FileSystemError.FileNotFound(uri);
    }
    fileInfo.meta.deleted = true;

    parentDir.entries.delete(basename);
  }

  rename(
    oldUri: Uri,
    newUri: Uri,
    options: { readonly overwrite: boolean }
  ): void {
    throw FileSystemError.Unavailable('Not Supported');
  }

  syncAsset() {
    const files = this.dirtyAssets;
    return Promise.all(
      files.map((asset) => {
        if (asset.meta.created) {
          const assetInfo: ProjectAssetCreateInfo = {
            name: asset.file.name,
            type: 0,
            uuid: uuid4(),
            meta: '',
            projectId: asset.meta.dirInfo!.file.data!.id,
          };
          return createAsset({
            info: assetInfo,
            assetContent: {
              buffer: Buffer.from(asset.meta.content),
              filename: asset.file.name,
            },
          });
        } else {
          return updateProjectAsset(asset.file.data.id, undefined, {
            buffer: Buffer.from(asset.meta.content),
            filename: asset.file.name,
          });
        }
      })
    ).then(() => {
      if (files.length > 0) {
        window.showInformationMessage(
          `Sync ${files.length} files successfully`
        );
      }
    });
  }
}

let _FSProvider: ProjectFSProvider;
export function getProjectFSProvider(): ProjectFSProvider {
  if (!_FSProvider) {
    _FSProvider = new ProjectFSProvider();
  }
  return _FSProvider;
}
