import { commands, window } from 'vscode';
import UIController from '../controllers/UIController';
import Project from '../models/Project';
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
  private _openedProject: Project;

  private static _userInfoMetaFilename = '.user.meta';
  private static _projectListMetaFilename = '.projects.meta';

  set userInfo(info: IUserInfo) {
    this._userInfo = info;
    this.updateUserInfoMeta();
    this._uiController.updateUserStatus(info);
  }

  get openedProject() {
    return this._openedProject;
  }

  set openedProject(project: Project) {
    this._openedProject = project;
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
      LocalFileManager.localRootPath,
      UserContext._userInfoMetaFilename
    );
  }

  getProjectById(projectId: string): Project | undefined {
    for (const project of this._projectList) {
      if (project.data.id.toString() === projectId) return project;
    }
  }
}
