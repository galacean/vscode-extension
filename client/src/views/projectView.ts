import {
  ExtensionContext,
  FileType,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
} from 'vscode';
import { ProjectListDataChangeEvent, getProjectListData } from '@data/project';
import { getUserInfo } from '@/request';
import { fetchContentByUrl, hashMD5, showUserInfoStatusBar } from '@/utils';
import { isLogin } from '@data/account';
import { Directory, getProjectFSProvider } from '@/TextDocProvider';

class ProjectListViewTreeDataProvider
  implements TreeDataProvider<ITreeViewItem<any, Uri>>
{
  private _elementMap = new Map<string, ITreeViewItem<any, Uri>>();

  getElementByUri(uri: Uri | string) {
    let uriString = uri;
    if (uri instanceof Uri) {
      uriString = uri.toString();
    }
    return this._elementMap.get(uriString as string);
  }

  onDidChangeTreeData = ProjectListDataChangeEvent.event;

  getTreeItem(element: ITreeViewItem<any, Uri>): TreeItem {
    const item = new TreeItem(
      element.name,
      element.isProject
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );
    if (element.isProject) {
      item.iconPath = new ThemeIcon('file-directory');
    }
    item.resourceUri = element.uri;
    if (!element.isProject) {
      item.contextValue = 'asset';
      item.command = {
        title: '',
        command: 'galacean.asset.show',
        arguments: [element.uri],
      };
    } else {
      item.contextValue = 'project';
      item.command = {
        command: 'galacean.project.click',
        arguments: [element.uri],
        title: '',
      };
    }

    return item;
  }

  async getChildren(
    element?: ITreeViewItem<any, Uri>
  ): Promise<ITreeViewItem<any, Uri>[]> {
    console.log('get children: ', element?.uri.toString());
    const fsProvider = getProjectFSProvider();

    if (!element) {
      const projectList = await fsProvider.getProjectList();
      return projectList.map((project) => {
        const uri = Uri.parse(`${fsProvider.schema}:/${project.id}`);
        const item = {
          id: project.id,
          name: project.name,
          isProject: true,
          uri,
        };
        this._elementMap.set(uri.toString(), item);
        return item;
      });
    } else {
      const assetList = await fsProvider.getAssetList(element.id, true);
      return assetList.map((asset) => {
        const uri = Uri.parse(
          `${fsProvider.schema}:/${asset.projectId}/${asset.name}`
        );
        const item = {
          id: asset.id,
          name: asset.name,
          isProject: false,
          uri,
        };
        this._elementMap.set(uri.toString(), item);
        return item;
      });
    }
  }
}

let _projectListTreeViewDataProvider: ProjectListViewTreeDataProvider;
export function getProjectListTreeViewProvider() {
  if (!_projectListTreeViewDataProvider) {
    _projectListTreeViewDataProvider = new ProjectListViewTreeDataProvider();
  }
  return _projectListTreeViewDataProvider;
}

export function initProjectView(context: ExtensionContext) {
  window.createTreeView<ITreeViewItem<any, Uri>>('galacean-project-list', {
    treeDataProvider: getProjectListTreeViewProvider(),
  });
}

export async function initUserStatusBar(context: ExtensionContext) {
  if (!(await isLogin())) return;
  const userInfo = await getUserInfo();
  showUserInfoStatusBar(context, `Galacean: ${userInfo.data.data.name}`);
}
