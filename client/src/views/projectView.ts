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
import { ProjectListDataChangeEvent } from '@data/project';
import { getUserInfo } from '@/request';
import { showUserInfoStatusBar } from '@/utils';
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
    if (!(await isLogin())) return [];
    console.log('get children: ', element?.uri.toString());
    const fsProvider = getProjectFSProvider();

    if (!element) {
      const projectList = await fsProvider.getProjectList();
      return projectList
        .map((project) => {
          const uri = Uri.parse(`${fsProvider.schema}:/${project.id}`);
          const item = {
            id: project.id,
            name: project.name,
            isProject: true,
            uri,
          };
          this._elementMap.set(uri.toString(), item);
          return item;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    } else {
      await fsProvider.getAssetList(element.id);
      const projectDirectory = fsProvider.getFileInfo(element.uri)
        .file as Directory;
      const ret: ITreeViewItem<any, Uri>[] = [];
      for (const file of projectDirectory.entries.values()) {
        const uri = Uri.parse(
          `${fsProvider.schema}:/${element.id}/${file.name}`
        );
        const item = {
          name: file.name,
          isProject: false,
          uri,
        };
        ret.push(item);
        this._elementMap.set(uri.toString(), item);
      }
      return ret.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  refresh(uri?: Uri) {
    if (!uri || uri.toString() === getProjectFSProvider().rootUri.toString()) {
      return ProjectListDataChangeEvent.fire();
    }
    const element = this.getElementByUri(uri);
    if (!element) {
      throw Error(`Not found uri ${uri.toString()}`);
    }
    ProjectListDataChangeEvent.fire(element);
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
