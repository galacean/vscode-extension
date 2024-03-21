import { basename, join, parse } from 'path';
import { ASSET_EXT, ASSET_TYPE } from '../constants';
import Project from './Project';
import { Uri } from 'vscode';
import { renameAsset } from '../utils';
import LocalFileManager from './LocalFileManager';

export default class Asset {
  private _data: IAsset;
  get data() {
    return this._data;
  }
  // private _content: string;
  private _meta: any;

  /** 相对项目文件夹路径 */
  private get _pathPrefix(): string[] {
    const ret: string[] = [];
    if (this._data.parentId) {
      const parent = (this.project.allAssets ?? this.project.assets).find(
        (item) => item.data.uuid.toString() === this._data.parentId.toString()
      );
      if (parent) {
        ret.unshift(...parent._pathPrefix, parent.data.name);
      }
    }
    return ret;
  }

  get localPath() {
    return join(
      this.project.getLocalPath(),
      ...this._pathPrefix,
      `${this.filename}${this.extension ?? ''}`
    );
  }

  get localMetaPath() {
    return join(
      this.project.getLocalMetaDirPath(),
      ...this._pathPrefix,
      `${this.filename}${this.extension}.meta`
    );
  }

  get type(): (typeof ASSET_TYPE)[number] {
    return this._meta.type;
  }

  get id() {
    return this._data.id;
  }

  private _project: Project;
  get project() {
    return this._project;
  }

  /** without extension */
  get filename() {
    const p = parse(this._data.name);
    return p.name;
  }

  /** with extension */
  get fullName() {
    return `${this.filename}${this.extension}`;
  }

  get extension() {
    return ASSET_EXT[this.type];
  }

  get localUri() {
    return Uri.file(this.localPath);
  }

  constructor(data: IAsset, project: Project) {
    this._data = data;
    this._project = project;
    this._meta = JSON.parse(data.meta);
  }

  async rename(uri: Uri, newDirAssetUUID?: string | null) {
    const newName = basename(uri.path);
    renameAsset(this, newName, newDirAssetUUID)
      .then((data) => {
        this._data = data;
      })
      .catch(() => {
        this._data.name = newName;
      })
      .finally(() => {
        LocalFileManager.writeFile(
          this.localMetaPath,
          JSON.stringify(this._data)
        );
      });
  }
}
