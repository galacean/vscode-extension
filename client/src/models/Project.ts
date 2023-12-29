import { basename, join } from 'path';
import Asset from './Asset';
import LocalFileManager from './LocalFileManager';
import HostContext from '../context/HostContext';
import { promises as fsPromise, mkdirSync } from 'fs';
import { fetchProjectDetail } from '../utils/request';
import { pick } from '../utils';
import AssetChangesViewProvider from '../providers/viewData/AssetChangesViewProvider';

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
  get allAssets() {
    return this._allAssets;
  }
  set allAssets(list: Asset[]) {
    this._allAssets = list;
  }

  /** shaders and scripts */
  private _assets: Asset[] = [];
  get assets() {
    return this._assets;
  }

  private _assetsInitialized = false;
  get assetsInitialized() {
    return this._assetsInitialized;
  }

  get meta(): IProjectMeta {
    return pick(this.data, Project.MetaKeys);
  }

  constructor(data: IProject) {
    this.data = data;
  }

  async initAssets() {
    if (LocalFileManager.existProject(this)) {
      await this.initAssetsFromLocal();
    } else {
      mkdirSync(this.getLocalPath(), { recursive: true });
      await this.updateAssetsFromServer();
    }
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

  /** update local meta and pull assets */
  async updateAssetsFromServer(localSync = true) {
    if (AssetChangesViewProvider.instance.stagedChanges.length > 0) {
      throw 'Staged asset changes exist.';
    }

    await this.pullAssets();
    LocalFileManager.updateProjectPkgJson(HostContext.userId, this);
  }

  findAssetByLocalPath(path: string) {
    for (const asset of this._assets) {
      if (asset.localPath === path) return asset;
    }
  }

  findAssetById(id: string) {
    for (const asset of this._assets) {
      if (asset.data.id.toString() === id) return asset;
    }
  }

  private async pullAssets() {
    console.log('pulling data', this.data.id, this.data.name);
    const projectData = await fetchProjectDetail(this.data.id.toString());
    this._allAssets = projectData.assets.map((item) => new Asset(item, this));

    Object.assign(this.data, pick(projectData, Project.MetaKeys));
    HostContext.userContext.updateUserProjectListMeta();

    await this._initAssets();
    this._assetsInitialized = true;
  }

  private async initAssetsFromLocal() {
    const assetMetaPathList = this.getLocalAssetMeta();
    this._assets.length = 0;

    this._assets.push(
      ...(await Promise.all(
        assetMetaPathList.map(async (path) => {
          const content = await fsPromise.readFile(path);
          const meta = JSON.parse(content.toString()) as IAssetMeta;
          const asset = new Asset(meta, this);

          asset.setLocalPath(path);

          await asset.init(false);
          return asset;
        })
      ))
    );
    this._assetsInitialized = true;
  }

  private getLocalAssetMeta() {
    return LocalFileManager.readProjectFiles(this, {
      meta: true,
    });
  }

  private async _initAssets() {
    if (!this._allAssets) {
      throw 'no assets in project';
    }
    this.assets.length = 0;

    await Promise.all(
      this._allAssets.map(async (item) => {
        if (!Project.assetTypes.includes(item.type)) return;

        item.initLocalPath();
        await item.init();
        this.assets.push(item);
      })
    );
  }
}
