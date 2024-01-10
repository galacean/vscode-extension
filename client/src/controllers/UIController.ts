import { StatusBarItem } from 'vscode';
import ProjectListViewProvider from '../providers/viewData/ProjectListViewProvider';

export default class UIController {
  private statusBar: StatusBarItem;
  private assetSyncStatusBar: StatusBarItem;
  projectListViewDataProvider: ProjectListViewProvider;

  constructor(
    statusBar: StatusBarItem,
    assetSyncStatusBar: StatusBarItem,
    projectListViewDataProvider: ProjectListViewProvider
  ) {
    this.statusBar = statusBar;
    this.assetSyncStatusBar = assetSyncStatusBar;
    this.projectListViewDataProvider = projectListViewDataProvider;
  }

  updateUserStatus(info: IUserInfo) {
    this.statusBar.text = `$(accounts-view-bar-icon) ${info.name}`;
    this.statusBar.tooltip = 'Galacean User';
    this.statusBar.show();
  }

  showSyncStatusBar(syncing: boolean) {
    this.assetSyncStatusBar.text = syncing
      ? `$(sync~spin) Sync...`
      : `$(sync) Pull Assets`;
    this.assetSyncStatusBar.tooltip = 'click to sync';
    this.assetSyncStatusBar.show();
  }

  updateProjectListView() {
    this.projectListViewDataProvider.refresh();
  }
}
