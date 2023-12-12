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
  implements TreeDataProvider<Project>
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

  getTreeItem(element: Project): TreeItem | Thenable<TreeItem> {
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

  getChildren(element?: Project): ProviderResult<Project[]> {
    if (!HostContext.instance.isLogin()) return [];
    return HostContext.userContext.projectList;
  }

  refresh() {
    this._dataChangedEventEmitter.fire();
  }
}
