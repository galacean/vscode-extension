import { StatusBarItem, TreeView, window } from 'vscode';
import ProjectListViewProvider from '../providers/viewData/ProjectListViewProvider';
// import CommitViewDataProvider from '../providers/viewData/CommitViewProvider';

export default class UIController {
  statusBar: StatusBarItem;
  projectListViewDataProvider: ProjectListViewProvider;
  // commitListViewDataProvider: CommitViewDataProvider;

  constructor(
    statusBar: StatusBarItem,
    projectListViewDataProvider: ProjectListViewProvider
    // commitListViewDataProvider: CommitViewDataProvider
  ) {
    this.statusBar = statusBar;
    this.projectListViewDataProvider = projectListViewDataProvider;
    // this.commitListViewDataProvider = commitListViewDataProvider;
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

  // updateCommitListView() {
  //   this.commitListViewDataProvider.refresh();
  // }
}
