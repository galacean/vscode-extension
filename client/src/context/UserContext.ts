import { window } from 'vscode';
import { ASSET_TYPE, EViewID } from '../constants';
import LocalFileManager from '../controllers/LocalFileManager';
import UIController from '../controllers/UIController';
import Asset from '../models/Asset';
import Project from '../models/Project';

export default class UserContext {
  private _userInfo: IUserInfo;
  private _projectList: Project[];
  private _uiController: UIController;
  private _currentProject: IProjectDetail;
  private _projectAssetList: Asset[];

  set userInfo(info: IUserInfo) {
    this._userInfo = info;
    this._uiController.updateUserStatus(info);
  }

  get userInfo() {
    return this._userInfo;
  }

  get userId() {
    return this._userInfo.id;
  }

  get projectList() {
    return this._projectList;
  }

  set projectList(list: Project[]) {
    this._projectList = list;
    for (const project of list) {
      this._updateProjectMeta(project);
    }
    this._uiController.updateProjectListView();
  }

  constructor(UIController: UIController) {
    this._uiController = UIController;
  }

  async setCurrentProject(info: IProjectDetail) {
    this._currentProject = info;
    return window.withProgress(
      { location: { viewId: EViewID.ProjectList }, title: 'syncing' },
      () => {
        return this._initProjectAssetList(
          info.assets.map((item) => new Asset(item))
        ).then((res) => {
          this._projectAssetList = res;
          for (const asset of this._projectAssetList) {
            this._updateAsset(asset);
          }
        });
      }
    );
  }

  private _updateProjectMeta(project: Project) {
    const localMeta = LocalFileManager.instance.readProjectMeta(
      this._userInfo.id,
      project
    );
    if (localMeta.gmtModified < new Date(project.data.gmtModified)) {
      LocalFileManager.instance.updateProjectMeta(
        this._userInfo.id,
        project.data.id.toString(),
        {
          gmtCreate: new Date(project.data.gmtCreate),
          gmtModified: new Date(project.data.gmtModified),
        }
      );
    }
  }

  private _updateAsset(asset: Asset) {
    const localMeta = LocalFileManager.instance.readAssetMeta(
      this._userInfo.id,
      asset
    );
    if (
      localMeta.gmtModified < new Date(asset.data.gmtModified) ||
      !LocalFileManager.instance.exist(asset)
    ) {
      LocalFileManager.instance.updateAsset(this._userInfo.id, asset);
    }
  }

  private async _initProjectAssetList(list: Asset[]): Promise<Asset[]> {
    const tmpMap = new Map<string, Asset>();
    for (const asset of list) {
      tmpMap.set(asset.id, asset);
    }
    const getParentPathPrefix = (asset: Asset) => {
      if (asset.data.parentId) {
        const parent = tmpMap.get(asset.data.parentId);
        getParentPathPrefix(parent);
        asset.pathPrefix.unshift(parent.data.name, ...parent.pathPrefix);
      }
    };

    const ret: Asset[] = [];
    for (const asset of list) {
      if (!ASSET_TYPE.includes(asset.type)) continue;

      getParentPathPrefix(asset);
      ret.push(asset as any);
    }
    await Promise.all(ret.map((item) => item.init()));
    return ret;
  }

  getProjectById(projectId: string): Project | undefined {
    for (const project of this._projectList) {
      if (project.data.id.toString() === projectId) return project;
    }
  }
}
