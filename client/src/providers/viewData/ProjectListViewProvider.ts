import {
  Event,
  EventEmitter,
  ProviderResult,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
} from 'vscode';
import HostContext from '../../context/HostContext';
import OpenProject from '../../commands/OpenProject';
import Project from '../../models/Project';

export default class ProjectListViewProvider
  implements TreeDataProvider<Project | 'more'>
{
  static _singleton: ProjectListViewProvider;

  static get instance() {
    if (!this._singleton) {
      this._singleton = new ProjectListViewProvider();
    }
    return this._singleton;
  }

  private _dataChangedEventEmitter = new EventEmitter<void>();
  onDidChangeTreeData?: Event<void | Project | Project[]>;

  private _itemIcon = new ThemeIcon('root-folder');

  private constructor() {
    this.onDidChangeTreeData = this._dataChangedEventEmitter.event;
  }

  getTreeItem(element: Project | 'more'): TreeItem | Thenable<TreeItem> {
    if (element === 'more') {
      const item = new TreeItem('More ...');
      item.tooltip = 'load more projects.';
      item.command = {
        title: 'more',
        command: 'galacean.more.projects',
      };
      item.iconPath = new ThemeIcon('plus');
      return item;
    } else {
      const item = new TreeItem(element.data.name);
      item.id = element.data.id.toString();
      item.iconPath = this._itemIcon;
      item.tooltip = `${item.id} - ${element.data.description}`;
      item.command = {
        title: 'open',
        command: OpenProject.command,
        arguments: [item.id],
      };
      return item;
    }
  }

  getChildren(element?: Project): ProviderResult<(Project | 'more')[]> {
    if (
      !HostContext.instance.isLogin() ||
      !HostContext.userContext.projectList?.length
    )
      return [];
    return [...HostContext.userContext.projectList, 'more'];
  }

  refresh() {
    this._dataChangedEventEmitter.fire();
  }
}
