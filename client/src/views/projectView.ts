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
import { fetchContentByUrl, hashMD5, showUserInfoStatusBar } from '@/utils';
import { fetchProjectAssetList } from '@/request/project';
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
    if (!(await isLogin())) {
      return [];
    }
    console.log('get children: ', element?.uri.toString());
    const fsProvider = getProjectFSProvider();

    const parentUri = element?.uri ?? Uri.parse(`${fsProvider.schema}:/`);
    const parentFileInfo = fsProvider.getFileInfo(parentUri).file as Directory;
    const ret: ITreeViewItem<any, Uri>[] = [];
    for (const entry of parentFileInfo.entries.values()) {
      const isDir = entry.type === FileType.Directory;
      const uri = Uri.joinPath(
        parentUri,
        isDir ? entry.data.id.toString() : entry.name
      );
      const child = {
        id: entry.data?.id,
        name: entry.name,
        isProject: isDir,
        uri,
      };
      if (isDir) {
        this._elementMap.set(uri.toString(), child);
      }
      ret.push(child);
    }
    return ret;
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
