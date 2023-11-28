import { StatusBarItem, TreeView, window } from 'vscode';
import ProjectListViewProvider from '../providers/viewData/ProjectListViewProvider';

export default class UIController {
  statusBar: StatusBarItem;
  projectListView: TreeView<IProject>;
  projectListViewDataProvider: ProjectListViewProvider;

  constructor(
    statusBar: StatusBarItem,
    projectListView: TreeView<IProject>,
    projectListViewDataProvider: ProjectListViewProvider
  ) {
    this.statusBar = statusBar;
    this.projectListView = projectListView;
    this.projectListViewDataProvider = projectListViewDataProvider;
  }

  updateUserStatus(info: IUserInfo) {
    if (this.statusBar) {
      this.statusBar.text = `$(accounts-view-bar-icon) ${info.name}`;
      this.statusBar.tooltip = 'Galacean User';
    }
    this.statusBar.show();
  }

  updateProjectListView() {
    this.projectListViewDataProvider.refresh();
  }
}
