import {
  ExtensionContext,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  window,
} from 'vscode';
import {
  ProjectListDataChangeEvent,
  getProjectListData,
} from '../data/project';
import { getUserInfo } from '@/request';
import { showUserInfoStatusBar } from '@/utils';
import { fetchProjectAssetList } from '@/request/project';

export function initProjectView(context: ExtensionContext) {
  window.createTreeView<ITreeViewItem>('galacean-project-list', {
    treeDataProvider: {
      getTreeItem(element) {
        const item = new TreeItem(
          element.label,
          element.isProject
            ? TreeItemCollapsibleState.Collapsed
            : TreeItemCollapsibleState.None
        );
        item.iconPath = new ThemeIcon(
          element.isProject ? 'file-directory' : 'file'
        );
        if (!element.isProject) {
          item.contextValue = 'asset';
          item.command = {
            title: '',
            command: 'galacean.asset.show',
            arguments: [element.data],
          };
        }
        return item;
      },
      getChildren(element) {
        if (!element) {
          return getProjectListData(true).then((res) =>
            res.map((item) => {
              return {
                id: item.id,
                label: item.name,
                data: item,
                isProject: true,
              };
            })
          );
        } else {
          return fetchProjectAssetList({ projectId: element.id }).then(
            (res) => {
              const assetList = res.data.data.list;
              return assetList.map((item) => ({
                id: item.id,
                label: item.name,
                data: item,
                isProject: false,
              }));
            }
          );
        }
      },
      onDidChangeTreeData: ProjectListDataChangeEvent.event,
    },
  });
}

export async function initUserStatusBar(context: ExtensionContext) {
  const userInfo = await getUserInfo();
  showUserInfoStatusBar(context, `Galacean: ${userInfo.data.data.name}`);
}
