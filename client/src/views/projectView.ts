import {
  ExtensionContext,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
} from 'vscode';
import { ProjectListDataChangeEvent, getProjectListData } from '@data/project';
import { getUserInfo } from '@/request';
import { fetchContentByUrl, showUserInfoStatusBar } from '@/utils';
import { fetchProjectAssetList } from '@/request/project';
import { isLogin } from '@data/account';
import { getProjectFSProvider } from '@/TextDocProvider';

export class ProjectListViewTreeDataProvider
  implements TreeDataProvider<ITreeViewItem<any, Uri>>
{
  onDidChangeTreeData = ProjectListDataChangeEvent.event;

  getTreeItem(element: ITreeViewItem<any, Uri>): TreeItem {
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
        arguments: [element.uri],
      };
    }
    return item;
  }

  async getChildren(
    element?: ITreeViewItem<any, Uri>
  ): Promise<ITreeViewItem<any, Uri>[]> {
    if (!(await isLogin())) {
      return [];
    }
    const fsProvder = getProjectFSProvider();

    if (!element) {
      return getProjectListData(true).then((res) => {
        return res.map((item) => {
          const uri = Uri.parse(`${fsProvder.schema}:/${item.id}`);
          fsProvder.setUriData(uri.toString(), item);
          fsProvder.createDirectory(uri);
          return {
            id: item.id,
            label: item.name,
            data: item,
            isProject: true,
            uri,
          };
        });
      });
    } else {
      return fetchProjectAssetList({ projectId: element.id }).then((res) => {
        const assetList = res.data.data.list;
        return Promise.all(
          assetList.map(async (item) => {
            const uri = Uri.parse(
              `${fsProvder.schema}:/${item.projectId}/${item.name}`
            );
            const assetContent: string = item.url
              ? await fetchContentByUrl(item.url)
              : Buffer.from('');
            fsProvder.setUriData(uri.toString(), item);
            fsProvder.writeFile(uri, Buffer.from(assetContent), {
              create: true,
              overwrite: true,
            });
            return {
              id: item.id,
              label: item.name,
              data: item,
              isProject: false,
              uri,
            };
          })
        );
      });
    }
  }
}

export function initProjectView(context: ExtensionContext) {
  window.createTreeView<ITreeViewItem<any, Uri>>('galacean-project-list', {
    treeDataProvider: new ProjectListViewTreeDataProvider(),
  });
}

export async function initUserStatusBar(context: ExtensionContext) {
  if (!(await isLogin())) return;
  const userInfo = await getUserInfo();
  showUserInfoStatusBar(context, `Galacean: ${userInfo.data.data.name}`);
}
