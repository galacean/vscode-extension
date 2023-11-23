import { join } from 'path';
import { curl } from '../request';
import { createHash } from 'crypto';

export default class Asset {
  readonly data: IAsset;
  private _content: string;
  private meta: any;
  md5: string | undefined;
  /** 相对项目文件夹路径 */
  readonly pathPrefix: string[] = [];

  get type() {
    return this.meta.type;
  }

  get id() {
    return this.meta.id;
  }

  get content() {
    return this._content;
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

  constructor(data: IAsset) {
    this.data = data;
    this.meta = JSON.parse(data.meta);
  }

  async init() {
    if (this.data.url) {
      this._content = await curl(this.data.url);
      this.md5 = createHash('md5').update(this._content).digest('hex');
    }
  }

  getLocalPath(localRootPath: string, userId: string) {
    return join(
      localRootPath,
      userId,
      this.data.projectId.toString(),
      ...this.pathPrefix,
      `${this.data.name}${this.extension}`
    );
  }
}
