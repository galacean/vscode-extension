import { commands, window } from 'vscode';
import UIController from '../controllers/UIController';
import Project, { IDirtyAsset } from '../models/Project';
import LocalFileManager from '../models/LocalFileManager';
import { join } from 'path';
import { pick } from '../utils';

export default class UserContext {
  private _userInfo: IUserInfo;
  private _projectList: Project[];
  private _uiController: UIController;
  /**
   * Current opened project
   */
  private _currentProject: Project;
  /**
   * Project selected for push data
   */
  private _pushProject?: Project;

  private _dirtyAssets: IDirtyAsset[];

  private static _userInfoMetaFilename = '.user.meta';
  private static _projectListMetaFilename = '.projects.meta';

  get dirtyAssets() {
    return this._dirtyAssets;
  }

  set dirtyAssets(assets: IDirtyAsset[]) {
    this._dirtyAssets = assets;
    // TODO: update ui
  }

  set userInfo(info: IUserInfo) {
    this._userInfo = info;
    this.updateUserInfoMeta();
    this._uiController.updateUserStatus(info);
  }

  get currentProject() {
    return this._currentProject;
  }

  set currentProject(project: Project) {
    this._currentProject = project;
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
    this.updateUserProjectListMeta();
    this._uiController.updateProjectListView();
  }

  constructor(UIController: UIController) {
    this._uiController = UIController;
  }

  async setPushProject(project: Project) {
    if (!LocalFileManager.existProject(project)) {
      window.showInformationMessage('Pull project data first!');
      return;
    }
    if (this._pushProject?.data.id === project.data.id) return;
    const tmpAssets = await project.getDirtyAssets();

    this.dirtyAssets = tmpAssets.filter((item) => !!item);
    commands.executeCommand('setContext', 'galacean.project.selected', project);
  }

  private updateUserInfoMeta() {
    const userMetaFilePath = this.getUserInfoMetaFilePath();
    LocalFileManager.writeFile(
      userMetaFilePath,
      JSON.stringify(this._userInfo)
    );
  }

  updateUserProjectListMeta() {
    const projectListMetaFilePath = this.getUserProjectListMetaFilePath();
    LocalFileManager.writeFile(
      projectListMetaFilePath,
      JSON.stringify(
        this._projectList.map((item) => pick(item.data, Project.MetaKeys))
      )
    );
  }

  getUserProjectListMetaFilePath() {
    return join(
      LocalFileManager.getUserDirPath(this.userId),
      UserContext._projectListMetaFilename
    );
  }

  getUserInfoMetaFilePath() {
    return join(
      LocalFileManager.getUserDirPath(this.userId),
      UserContext._userInfoMetaFilename
    );
  }

  getProjectById(projectId: string): Project | undefined {
    for (const project of this._projectList) {
      if (project.data.id.toString() === projectId) return project;
    }
  }
}
