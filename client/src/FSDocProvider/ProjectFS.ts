import {
  BUILTIN_PKGS,
  FSSchema,
  URI_QUERY_CREATE_LOCALLY,
  URI_QUERY_EDIT_LOCALLY,
} from '@/constants';
import {
  createAsset,
  deleteAsset,
  fetchProjectAssetList,
  getProjectList,
  updateProjectAsset,
  updateProjectDependencies,
} from '@/request/project';
import { fetchContentByUrl, getParentUri, hashMD5 } from '@/utils';
import * as path from 'path';
import * as fs from 'fs';
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
  workspace,
} from 'vscode';
import { v4 as uuid4 } from 'uuid';
import { getProjectListTreeViewProvider } from '@/views/projectView';
import { LocalProjectManager } from '@/LocalProjectManager';
import { INIT_FILE_STRING } from './constants';

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
    this.ctime = Date.now();
    this.mtime = Date.now();
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
  /** Changed props */
  dirtyProps?: Partial<IProjectAsset>;
  /** Deleted locally */
  deleted: boolean;
  /** Directory uri */
  dirInfo?: FileInfo;
  /** uri */
  uri: Uri;
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
    const contentString = content.toString();
    if (!contentString) {
      this.meta.content = content;
      return false;
    }
    const hash = hashMD5(contentString);
    const needUpdate = hash !== this.meta.contentHash;
    if (needUpdate) {
      this.meta.content = content;
      this.meta.contentHash = hash;
    }
    return needUpdate;
  }

  /** update mtime */
  touch() {
    if (this.file.mtime > Date.now()) {
      debugger;
    }
    this.file.mtime = Date.now();
  }

  /** create by server data */
  static from(data: Entry, uri: Uri): FileInfo {
    return new FileInfo(data, {
      dirty: false,
      created: false,
      deleted: false,
      uri,
    });
  }

  /** create locally */
  static create(data: Entry, uri: Uri): FileInfo {
    return new FileInfo(data, {
      dirty: true,
      created: true,
      deleted: false,
      uri,
    });
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

  // Cached remote data -------
  private _projectList: Array<IProject> | undefined = undefined;
  private _projectAssetListMap: Map<string, Array<IProjectAsset>> = new Map();
  // --------------------------

  get dirtyAssets(): Array<FileInfo> {
    const ret: Array<FileInfo> = [];
    for (const [_, v] of this._uriMap) {
      if (v.meta.dirty || v.meta.dirtyProps || v.meta.deleted || v.meta.created)
        ret.push(v);
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
    this.init();
    this.onDidChangeFile((e) => {
      const listViewDataProvider = getProjectListTreeViewProvider();
      for (const event of e) {
        const fileInfo = this.getFileInfo(event.uri);
        if (event.uri.toString() === this.rootUri.toString()) {
          this.getProjectList(true).then(() =>
            listViewDataProvider.refresh(event.uri, false)
          );
        } else if (fileInfo.file.type === FileType.Directory) {
          this.getAssetList(fileInfo.file.data.id, true).then(() => {
            listViewDataProvider.refresh(event.uri, false);
          });
        }
      }
    });
  }

  init() {
    this.setUriData(
      this.rootUri.toString(),
      FileInfo.from(this._rootEntry, this.rootUri)
    );
  }

  clearCache() {
    this._uriMap.clear();
    this._currentDir = undefined;
    this._projectList = undefined;
    this._projectAssetListMap.clear();
  }

  async _initProjectDirectory(project: IProject) {
    const uri = Uri.parse(`${this.schema}:/${project.id}`);
    const directory = new Directory(project.name, project);

    const dirInfo = FileInfo.from(directory, uri);
    this.setUriData(uri.toString(), dirInfo);
    this.createDirectory(uri, { init: true, override: true });
  }

  async _initAssetFile(asset: IProjectAsset) {
    const uri = Uri.parse(`${this.schema}:/${asset.projectId}/${asset.name}`);
    const uriString = uri.with({ query: '' }).toString();

    const file = new File(asset.name, asset);
    const fileInfo = FileInfo.from(file, uri);
    this.setUriData(uriString, fileInfo);
    await this.writeFile(uri, Buffer.from(INIT_FILE_STRING), {
      create: true,
      overwrite: true,
    });
  }

  /**
   * @param refresh Whether force to update
   */
  async getProjectList(refresh = false): Promise<IProject[]> {
    if (!this._projectList || refresh) {
      this._projectList = (await getProjectList()).data.data.list;
      for (const project of this._projectList) {
        this._initProjectDirectory(project);
      }
    }
    return this._projectList;
  }

  getProjectUriString(projectId: number | string) {
    return `${this.schema}:/${projectId}`;
  }

  private _clearProjectAssets(projectId: number | string) {
    const projectUriString = this.getProjectUriString(projectId);
    this._projectAssetListMap.delete(projectUriString);
    for (const uri of this._uriMap.keys()) {
      if (uri.startsWith(projectUriString + '/')) {
        this.delete(Uri.parse(uri), { recursive: true });
      }
    }
  }

  async getAssetList(
    projectId: number | string,
    refresh = false
  ): Promise<IProjectAsset[]> {
    // Have fetched remote data
    let cachedList = this._projectAssetListMap.get(projectId.toString());
    if (!cachedList || refresh) {
      this._clearProjectAssets(projectId);
      cachedList = (await fetchProjectAssetList({ projectId })).data.data.list;
      this._projectAssetListMap.set(projectId.toString(), cachedList);
      for (const asset of cachedList) {
        await this._initAssetFile(asset);
      }
    }

    return cachedList;
  }

  getFileInfo(uri: Uri | string) {
    if (uri instanceof Uri) {
      uri = uri.with({ query: '' });
    }
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

  createDirectory(
    uri: Uri,
    opts?: { init?: boolean; override?: boolean }
  ): void {
    const basename = path.basename(uri.path);
    const dirUri = uri.with({ path: path.dirname(uri.path) });
    let parentDir = this.getFileInfo(dirUri).file as Directory;
    if (parentDir.type !== FileType.Directory) {
      throw FileSystemError.FileNotADirectory(dirUri);
    }

    if (parentDir.entries.has(basename) && !opts?.override) {
      throw FileSystemError.FileExists(uri);
    }
    const uriString = uri.toString();

    let dirFileInfo = this.getFileInfo(uriString);
    if (!dirFileInfo || opts?.override) {
      // create locally
      const directory = new Directory(basename, dirFileInfo?.file.data);
      dirFileInfo = opts?.init
        ? FileInfo.from(directory, uri)
        : FileInfo.create(directory, uri);
      this._uriMap.set(uriString, dirFileInfo);
    }

    parentDir.entries.set(basename, dirFileInfo.file);
  }

  readDirectory(uri: Uri): [string, FileType][] {
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
    const uriString = uri.with({ query: '' }).toString();

    let fileInfo = this.getFileInfo(uriString);

    if (!fileInfo) {
      // create locally
      const file = new File(basename);
      fileInfo = FileInfo.create(file, uri);
      fileInfo.meta.dirty = fileInfo.setContent(content);
      fileInfo.meta.dirInfo = parentInfo;
    } else if (content.toString() === INIT_FILE_STRING) {
      // refresh, init
      fileInfo.meta.dirty = false;
      fileInfo.meta.dirtyProps = undefined;
      const remoteContent = await fetchContentByUrl(
        (fileInfo.file.data as IProjectAsset).url
      );
      fileInfo.setContent(Buffer.from(remoteContent));
    } else {
      // local save
      fileInfo.meta.dirty = fileInfo.setContent(content);
      // same content
      if (!fileInfo.meta.dirty) {
        return;
      }
    }

    this._uriMap.set(uriString, fileInfo);
    parent.entries.set(uriString, fileInfo.file);
    fileInfo.touch();
    if (
      path.extname(basename) === '.ts' &&
      !uri.query.includes(URI_QUERY_CREATE_LOCALLY) &&
      !uri.query.includes(URI_QUERY_EDIT_LOCALLY)
    ) {
      LocalProjectManager.writeScriptLocally(uri);
    }
    return;
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    const fileInfo = this.getFileInfo(uri);
    const file = fileInfo.file as File;
    if (fileInfo.file.type !== FileType.File) {
      throw FileSystemError.FileIsADirectory(uri);
    }
    if (fileInfo.meta.content) return fileInfo.meta.content;
    if (file.data?.url) {
      const content = await fetchContentByUrl(file.data.url);
      fileInfo.setContent(Buffer.from(content));
    }
    return fileInfo.meta.content;
  }

  delete(uri: Uri, options: { readonly recursive: boolean }): void {
    const dirUri = uri.with({ path: path.dirname(uri.path) });
    const uriString = uri.with({ query: '' }).toString();
    const parentDir = this.getFileInfo(dirUri).file as Directory;
    if (!parentDir.entries.has(uriString)) {
      throw FileSystemError.FileNotFound(uri);
    }
    const fileInfo = this.getFileInfo(uri);
    if (!fileInfo) {
      throw FileSystemError.FileNotFound(uri);
    }
    fileInfo.meta.deleted = true;

    parentDir.entries.delete(uriString);

    getProjectListTreeViewProvider().refresh(dirUri, true);
  }

  rename(
    oldUri: Uri,
    newUri: Uri,
    options: { readonly overwrite: boolean }
  ): void {
    const fileInfo = this.getFileInfo(oldUri);
    const parentUri = getParentUri(oldUri);
    if (getParentUri(newUri).toString() !== parentUri.toString()) {
      throw FileSystemError.Unavailable('Rename only support same directory');
    }

    if (this.getFileInfo(newUri.toString())) {
      window.showErrorMessage('Filename exist');
      return;
    }
    const newUriString = newUri.toString();
    const oldUriString = oldUri.toString();

    const newFileName = path.basename(newUriString);

    fileInfo.meta.dirtyProps = fileInfo.meta.dirtyProps ?? {};
    fileInfo.meta.dirtyProps.name = newFileName;

    this._uriMap.delete(oldUriString);
    this._uriMap.set(newUriString, fileInfo);

    const parentDirectory = this.getFileInfo(parentUri).file as Directory;
    const file = parentDirectory.entries.get(oldUriString);
    file.name = newFileName;

    parentDirectory.entries.delete(oldUriString);
    parentDirectory.entries.set(newUriString, file);

    getProjectListTreeViewProvider().refresh(parentUri, true);
  }

  syncAsset() {
    const files = this.dirtyAssets;
    // update dependencies
    if (LocalProjectManager.openedProjectUriInfo) {
      const extraPkgs = getProjectDependencies(
        LocalProjectManager.openedProjectUriInfo.localTempUri
      );
      const projectInfo = this.getFileInfo(
        LocalProjectManager.openedProjectUriInfo.memoUri
      ).file as Directory;
      const dependencies = JSON.parse(
        (projectInfo.data as IProject).dependencies ?? '{}'
      ) as Object;
      let needUpdate = false;
      for (const dep in extraPkgs) {
        if (!dependencies.hasOwnProperty(dep)) {
          needUpdate = true;
          dependencies[dep] = extraPkgs[dep];
        }
      }
      if (needUpdate) {
        updateProjectDependencies(
          projectInfo.data.id,
          JSON.stringify(dependencies)
        ).then((res) => {
          window.showInformationMessage('update dependencies successfully');
          projectInfo.data = res.data.data;
        });
      }
    }

    return Promise.all(
      files.map((asset) => {
        if (asset.meta.created) {
          // skip empty file
          if (!asset.meta.content.toString()) return;
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
        } else if (asset.meta.deleted) {
          return deleteAsset((asset.file.data as IProjectAsset).uuid);
        } else {
          return updateProjectAsset(
            asset.file.data.id,
            asset.meta.dirtyProps,
            asset.meta.dirty
              ? {
                  buffer: Buffer.from(asset.meta.content),
                  filename: asset.file.name,
                }
              : undefined
          );
        }
      })
    ).then(() => {
      for (const f of files) {
        f.meta.dirty = false;
        f.meta.created = false;
        f.meta.dirtyProps = undefined;
        if (f.meta.deleted) {
          this._uriMap.delete(f.meta.uri.toString());
        }
      }
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

function getProjectDependencies(projectFsUri: Uri) {
  const pkgJsonUri = path.join(projectFsUri.path, 'package.json');
  if (!fs.existsSync(pkgJsonUri)) {
    throw FileSystemError.FileNotFound(pkgJsonUri);
  }
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonUri).toString());

  const extraPkgs = {} as Record<string, string>;
  for (const depend in pkgJson.dependencies) {
    if (BUILTIN_PKGS.includes(depend)) continue;
    extraPkgs[depend] = pkgJson.dependencies[depend];
  }
  return extraPkgs;
}
