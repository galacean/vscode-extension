import {
  Event,
  EventEmitter,
  FileSystemWatcher,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  workspace,
} from 'vscode';
import Asset from '../../models/Asset';
import Project from '../../models/Project';
import HostContext from '../../context/HostContext';
import LocalFileManager from '../../models/LocalFileManager';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { GALACEAN_ASSET_SCHEMA, RES_DIR_PATH } from '../../constants';

enum EChangeGroup {
  StagedChanges = 'Staged Changes',
  Changes = 'Changes',
}

export interface IAssetChange {
  isDeleted: boolean;
  asset?: Asset;
  label: string;
  path: string;
}

export default class AssetChangesViewProvider
  implements TreeDataProvider<IAssetChange | EChangeGroup>
{
  private static _singleton: AssetChangesViewProvider;

  static get instance() {
    if (!this._singleton) {
      this._singleton = new AssetChangesViewProvider();
    }
    return this._singleton;
  }

  private _dataChangedEventEmitter = new EventEmitter<void>();
  onDidChangeTreeData?: Event<
    void | IAssetChange | EChangeGroup | (IAssetChange | EChangeGroup)[]
  >;

  private _changesAssets: IAssetChange[] = [];
  private _stagedChangesAssets: IAssetChange[] = [];
  get stagedChanges() {
    return this._stagedChangesAssets;
  }

  private _fsWatcher: FileSystemWatcher;
  get fsWatcher() {
    return this._fsWatcher;
  }

  constructor() {
    this.onDidChangeTreeData = this._dataChangedEventEmitter.event;
    this.initFSWatcher();
  }

  async initChanges(project?: Project) {
    const openedProject = project ?? HostContext.userContext.openedProject;

    const changes: IAssetChange[] = [];
    const localAssetPathList: string[] = openedProject.getLocalAssetFiles();

    await Promise.all(
      localAssetPathList.map(async (assetPath) => {
        const remoteAsset = openedProject.findAssetByLocalPath(assetPath);
        if (remoteAsset) {
          const localContent = (
            await workspace.fs.readFile(remoteAsset.localUri)
          ).toString();
          if (localContent !== remoteAsset.content) {
            changes.push({
              asset: remoteAsset,
              isDeleted: false,
              label: remoteAsset.fullName,
              path: assetPath,
            });
          }
        } else {
          // changes.push({
          //   label: basename(assetPath),
          //   isDeleted: false,
          //   path: assetPath,
          // });
        }
      })
    );

    const stagedUrls = this.getStagedFiles();

    const deletedAssets = openedProject.assets.filter(
      (item) => !localAssetPathList.includes(item.localPath)
    );

    for (const change of changes) {
      if (stagedUrls.includes(change.path)) {
        this._stagedChangesAssets.push(change);
      } else {
        this._changesAssets.push(change);
      }
    }
    for (const asset of deletedAssets) {
      this._changesAssets.push({
        asset,
        isDeleted: true,
        label: asset.fullName,
        path: asset.localPath,
      });
    }

    this.refresh();
  }

  clear() {
    this._changesAssets = [];
    this._stagedChangesAssets = [];
    this.refresh();
  }

  getChildren(
    element?: IAssetChange | EChangeGroup
  ): ProviderResult<(IAssetChange | EChangeGroup)[]> {
    if (!element) {
      if (this._stagedChangesAssets.length) {
        return [EChangeGroup.StagedChanges, EChangeGroup.Changes];
      }
      return [EChangeGroup.Changes];
    }

    if (element === EChangeGroup.Changes) {
      return this._changesAssets;
    } else {
      return this._stagedChangesAssets;
    }
  }

  getTreeItem(
    element: IAssetChange | EChangeGroup
  ): TreeItem | Thenable<TreeItem> {
    let item: TreeItem;
    if (typeof element === 'string') {
      item = new TreeItem(element, TreeItemCollapsibleState.Expanded);
    } else {
      item = new TreeItem(
        element.isDeleted ? `~~${element.label} - deleted~~` : element.label
      );
      item.iconPath = element.label.endsWith('.shader')
        ? Uri.file(join(RES_DIR_PATH, 'icons/shader.svg'))
        : Uri.file(join(RES_DIR_PATH, 'icons/ts.svg'));
      item.command = {
        title: 'Show changes',
        command: 'vscode.diff',
        tooltip: 'Diff your changes',
        arguments: [
          Uri.file(element.path),
          element.asset?.galaceanUri ??
            Uri.from({ scheme: GALACEAN_ASSET_SCHEMA, path: '-1' }),
          'Local changes ↔ Server',
        ],
      };
      item.contextValue = this._changesAssets.includes(element)
        ? 'change'
        : 'stagedChange';
    }
    return item;
  }

  refresh() {
    this._dataChangedEventEmitter.fire();
  }

  addStagedChange(change: IAssetChange) {
    this._removeChange(change.path);
    this._stagedChangesAssets.push(change);
    this.updateStagedMetaFile(change.path, 'add');
    this.refresh();
  }

  removeStagedChange(change: IAssetChange) {
    this._removeStagedChange(change.path);
    this._changesAssets.push(change);
    this.updateStagedMetaFile(change.path, 'remove');
    this.refresh();
  }

  private updateStagedMetaFile(localPath: string, action: 'add' | 'remove') {
    const metaFilePath = LocalFileManager.stagedChangeMetaFilePath;

    const stagedUrls: string[] = this.getStagedFiles();
    const index = stagedUrls.indexOf(localPath);

    if (action === 'remove' && index !== -1) {
      stagedUrls.splice(index, 1);
      writeFileSync(metaFilePath, JSON.stringify(stagedUrls));
    } else if (action === 'add' && index == -1) {
      stagedUrls.push(localPath);
      writeFileSync(metaFilePath, JSON.stringify(stagedUrls));
    }
  }

  private getStagedFiles(): string[] {
    const metaFilePath = LocalFileManager.stagedChangeMetaFilePath;
    if (!existsSync(metaFilePath)) {
      writeFileSync(metaFilePath, '[]');
      return [];
    }

    const content = readFileSync(metaFilePath).toString();
    return JSON.parse(content);
  }

  private initFSWatcher() {
    this._fsWatcher = workspace.createFileSystemWatcher(
      '**/{*,!node_modules,!.git,!.vscode}/*.{ts,shader}'
    );

    this._fsWatcher.onDidChange((uri) => {
      this.onLocalAssetChange(uri);
      this._onFileChange(uri);
    });

    // this._fsWatcher.onDidCreate((uri) => {
    //   this._changesAssets.push({
    //     label: basename(uri.path),
    //     isDeleted: false,
    //     path: uri.path,
    //   });
    //   this._onFileChange(uri);
    // });

    this._fsWatcher.onDidDelete((uri) => {
      const deletedAsset =
        HostContext.userContext.openedProject.findAssetByLocalPath(uri.path);
      if (deletedAsset) {
        this._changesAssets.push({
          asset: deletedAsset,
          label: deletedAsset.fullName,
          path: uri.path,
          isDeleted: true,
        });
      } else {
        this._removeChange(uri.path);
      }
      this._onFileChange(uri);
    });
  }

  private onLocalAssetChange(uri: Uri) {
    const localChanged = this._changesAssets.find(
      (item) => item.path === uri.path
    );
    if (!localChanged) {
      const change = this._addNewFileChange(uri.path);
      if (change) {
        const asset =
          HostContext.userContext.openedProject.findAssetByLocalPath(uri.path);
        change.asset = asset;
      }
      return;
    }

    if (!localChanged.asset) {
      this._addNewFileChange(uri.path);
    } else {
      const curContent = readFileSync(uri.path).toString();
      if (curContent === localChanged.asset.content) {
        this._removeChange(uri.path);
      }
    }
  }

  private _onFileChange(uri: Uri) {
    this._removeStagedChange(uri.path);
    this.refresh();
  }

  private _removeChange(filePath: string) {
    const idx = this._changesAssets.findIndex((item) => item.path === filePath);
    if (idx !== -1) this._changesAssets.splice(idx, 1);
  }

  private _removeStagedChange(filePath: string) {
    const idx = this._stagedChangesAssets.findIndex(
      (item) => item.path === filePath
    );
    if (idx !== -1) this._stagedChangesAssets.splice(idx, 1);
  }

  private _addNewFileChange(filePath: string) {
    if (
      this._changesAssets.findIndex((item) => item.path === filePath) === -1
    ) {
      const change: IAssetChange = {
        label: basename(filePath),
        isDeleted: false,
        path: filePath,
      };
      this._changesAssets.push(change);
      return change;
    }
  }
}
