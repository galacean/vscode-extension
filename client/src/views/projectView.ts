import { ExtensionContext, ThemeIcon, TreeItem, window } from 'vscode';
import { getProjectListData } from '../data/project';
import { getUserInfo } from '@/request';
import { showUserInfoStatusBar } from '@/utils';

export function initProjectView(context: ExtensionContext) {
  window.createTreeView<IProject>('galacean-project-list', {
    treeDataProvider: {
      getTreeItem(element) {
        const item = new TreeItem(element.name);
        item.iconPath = new ThemeIcon('file-directory');
        return item;
      },
      getChildren(element) {
        if (!element) {
          return getProjectListData();
        } else {
          // TODO:
        }
      },
    },
  });
}

export async function initUserStatusBar(context: ExtensionContext) {
  const userInfo = await getUserInfo();
  showUserInfoStatusBar(context, `Galacean: ${userInfo.data.data.name}`);
}
