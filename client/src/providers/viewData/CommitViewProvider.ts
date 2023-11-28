import {
  Event,
  EventEmitter,
  ProviderResult,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  Uri,
} from 'vscode';
import HostContext from '../../context/HostContext';
import { IDirtyAsset } from '../../models/Project';
import { RES_DIR_PATH } from '../../constants';

export default class CommitViewDataProvider
  implements TreeDataProvider<IDirtyAsset>
{
  static _singleton: CommitViewDataProvider;

  static get instance() {
    if (!this._singleton) {
      this._singleton = new CommitViewDataProvider();
    }
    return this._singleton;
  }

  private _dataChangedEventEmitter = new EventEmitter<void>();
  onDidChangeTreeData?: Event<void | IDirtyAsset | IDirtyAsset[]>;

  private constructor() {
    this.onDidChangeTreeData = this._dataChangedEventEmitter.event;
  }

  getChildren(element?: IDirtyAsset): ProviderResult<IDirtyAsset[]> {
    return HostContext.userContext.dirtyAssets;
  }

  getTreeItem(element: IDirtyAsset): TreeItem | Thenable<TreeItem> {
    const item = new TreeItem(element.asset.data.name);
    item.id = element.asset.id;
    item.iconPath =
      element.asset.type === 'Shader'
        ? new ThemeIcon('file-type-typescript')
        : Uri.joinPath(Uri.file(RES_DIR_PATH), 'icons', 'shader.svg');
    item.tooltip = element.asset.getLocalPath();

    return item;
  }
}
