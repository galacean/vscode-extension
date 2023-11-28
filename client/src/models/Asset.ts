import { join, parse } from 'path';
import { curl } from '../utils/request';
import LocalFileManager from './LocalFileManager';
import HostContext from '../context/HostContext';
import { ASSET_TYPE } from '../constants';
import Project from './Project';

export default class Asset {
  readonly data: IAsset;
  private _content: string;
  private readonly _meta: any;
  md5: string | undefined;
  /** 相对项目文件夹路径 */
  readonly pathPrefix: string[] = [];

  get type(): (typeof ASSET_TYPE)[number] {
    return this._meta.type;
  }

  get id() {
    return this._meta.id;
  }

  private _project: Project;
  get project() {
    if (!this._project) {
      this._project = HostContext.userContext.projectList.find(
        (item) => item.data.id === this.data.projectId
      );
    }
    return this._project;
  }

  get content() {
    return this._content;
  }

  private _filename: string;
  get filename() {
    if (!this._filename) {
      const tmp = parse(this.data.name);
      this._filename = tmp.name;
    }
    return this._filename;
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

  constructor(data: IAsset) {
    this.data = data;
    this._meta = JSON.parse(data.meta);
  }

  async init() {
    if (this.data.url) {
      this._content = await curl(this.data.url);
      this.md5 = LocalFileManager.getMD5(this._content);
    }
  }

  getLocalPath(localRootPath?: string, userId?: string) {
    return join(
      this.project.getLocalPath(localRootPath, userId),
      ...this.pathPrefix,
      `${this.filename}${this.extension}`
    );
  }

  getLocalMetaPath(localRootPath?: string, userId?: string) {
    return join(
      this.project.getLocalMetaDirPath(localRootPath, userId),
      ...this.pathPrefix,
      `${this.filename}${this.extension}.meta`
    );
  }
}
