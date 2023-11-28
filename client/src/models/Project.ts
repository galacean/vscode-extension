import { basename, join } from 'path';
import Asset from './Asset';
import LocalFileManager from './LocalFileManager';
import HostContext from '../context/HostContext';
import { promises as fsPromise } from 'fs';
import { fetchProjectDetail } from '../utils/request';
import { pick } from '../utils';

export interface IDirtyAsset {
  asset: Asset;
  content: string;
}

export default class Project {
  static assetTypes = ['Shader', 'script'];
  static _metaDirName = '.galacean';
  static MetaKeys: Array<keyof IProjectMeta> = [
    'id',
    'name',
    'description',
    'gmtCreate',
    'gmtModified',
  ];

  readonly data: IProject;

  private _allAssets?: Asset[];
  set allAssets(list: Asset[]) {
    this._allAssets = list;
  }

  /** shaders and scripts */
  private _assets: Asset[] = [];
  get assets() {
    return this._assets;
  }

  get meta(): IProjectMeta {
    return pick(this.data, Project.MetaKeys);
  }

  constructor(data: IProject) {
    this.data = data;
  }

  getLocalPath(localRootPath?: string, userId?: string) {
    return join(
      LocalFileManager.getUserDirPath(userId ?? HostContext.userId),
      this.data.id.toString()
    );
  }

  getLocalMetaDirPath(localRootPath?: string, userId?: string) {
    return join(this.getLocalPath(localRootPath, userId), Project._metaDirName);
  }

  /** @returns absolute file path list */
  getLocalAssetFiles() {
    return LocalFileManager.readProjectFiles(this, {
      meta: false,
      extensions: ['.shader', '.ts'],
    });
  }

  async initAssetsFromLocal() {
    const assetMetaPathList = this.getLocalAssetMeta();
    this._assets.length = 0;
    this._assets.push(
      ...(await Promise.all(
        assetMetaPathList.map(async (path) => {
          const content = await fsPromise.readFile(path);
          const meta = JSON.parse(content.toString()) as IAssetMeta;
          const asset = new Asset(meta);
          await asset.init();
          return asset;
        })
      ))
    );
  }

  private getLocalAssetMeta() {
    return LocalFileManager.readProjectFiles(this, {
      meta: true,
      // blackList: [Project._metaFileName],
    });
  }

  /** update local meta and pull assets */
  async updateAssetsFromServer() {
    await this.pullAssets();
    for (const asset of this.assets) {
      LocalFileManager.updateAsset(HostContext.userId, asset);
    }
  }

  async getDirtyAssets(): Promise<IDirtyAsset[]> {
    const projectAssetFiles = this.getLocalAssetFiles();
    return Promise.all(
      projectAssetFiles.map(async (assetPath) => {
        const assetName = basename(assetPath);
        const asset = this.assets.find((item) => item.data.name === assetName);
        if (!asset) return;

        const fileContent = (await fsPromise.readFile(assetPath)).toString();
        const curMD5 = LocalFileManager.getMD5(fileContent);
        if (curMD5 === asset.md5) return;
        return { asset, content: fileContent };
      })
    );
  }

  private async pullAssets() {
    console.log('pulling data', this.data.id, this.data.name);
    const projectData = await fetchProjectDetail(this.data.id.toString());
    this._allAssets = projectData.assets.map((item) => new Asset(item));

    Object.assign(this.data, pick(projectData, Project.MetaKeys));
    HostContext.userContext.updateUserProjectListMeta();

    await this.initAssets();
  }

  private async initAssets() {
    if (!this._allAssets) {
      throw 'no assets in project';
    }
    // if (!this.assetsInitialized) this._assets = [];
    this.assets.length = 0;

    const tmpMap = new Map<string, Asset>();
    for (const asset of this._allAssets) {
      tmpMap.set(asset.id, asset);
    }
    const getParentPathPrefix = (asset: Asset) => {
      if (asset.pathPrefix.length > 0) return asset.pathPrefix;
      if (asset.data.parentId) {
        const parent = tmpMap.get(asset.data.parentId);
        getParentPathPrefix(parent);
        asset.pathPrefix.unshift(...parent.pathPrefix, parent.data.name);
      }
    };

    for (const asset of this._allAssets) {
      if (!Project.assetTypes.includes(asset.type)) continue;

      getParentPathPrefix(asset);
      this.assets.push(asset as any);
    }
    await Promise.all(this.assets.map((item) => item.init()));
  }
}
