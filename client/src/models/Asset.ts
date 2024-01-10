import { join, parse } from 'path';
import { ASSET_TYPE } from '../constants';
import Project from './Project';
import { Uri } from 'vscode';
import LocalFileManager from './LocalFileManager';

export default class Asset {
  private _data: IAsset;
  get data() {
    return this._data;
  }
  // private _content: string;
  private _meta: any;

  /** 相对项目文件夹路径 */
  readonly _pathPrefix: string[] = [];
  private _localPath: string;
  get localPath() {
    return this._localPath;
  }

  private _localMetaPath: string;
  get localMetaPath() {
    return this._localMetaPath;
  }

  get type(): (typeof ASSET_TYPE)[number] {
    return this._meta.type;
  }

  get id() {
    return this._meta.id;
  }

  private _project: Project;
  get project() {
    return this._project;
  }

  private _filename: string;
  /** without extension */
  get filename() {
    if (!this._filename) {
      const tmp = parse(this.data.name);
      this._filename = tmp.name;
    }
    return this._filename;
  }

  /** with extension */
  get fullName() {
    return `${this.filename}${this.extension}`;
  }

  get extension() {
    switch (this.type) {
      case 'Shader':
        return '.shader';
      case 'script':
        return '.ts';
      default:
        throw `not support type: ${this.type}`;
    }
  }

  get localMeta(): IAssetMeta {
    return this.data;
  }

  get localUri() {
    return Uri.file(this.localPath);
  }

  constructor(data: IAsset, project: Project) {
    this._data = data;
    this._project = project;
    this._meta = JSON.parse(data.meta);
  }

  setLocalPath(metaPath: string) {
    this._localMetaPath = metaPath;
    const trimRegex = new RegExp(`(\/${Project._metaDirName}|\.meta)`, 'g');
    this._localPath = metaPath.replace(trimRegex, '');
  }

  initLocalPath() {
    Asset.getParentPathPrefix(this);

    this._localMetaPath = join(
      this.project.getLocalMetaDirPath(),
      ...this._pathPrefix,
      `${this.filename}${this.extension}.meta`
    );
    this._localPath = join(
      this.project.getLocalPath(),
      ...this._pathPrefix,
      `${this.filename}${this.extension}`
    );
  }

  private static getParentPathPrefix(asset: Asset) {
    if (asset._pathPrefix.length) return asset._pathPrefix;
    if (asset.data.parentId) {
      const parent = asset.project.allAssets.find(
        (item) => item.data.uuid.toString() === asset.data.parentId.toString()
      );
      if (parent) {
        Asset.getParentPathPrefix(parent);
        asset._pathPrefix.unshift(...parent._pathPrefix, parent.data.name);
      }
    }
  }
}
