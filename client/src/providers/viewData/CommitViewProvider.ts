// import {
//   Event,
//   EventEmitter,
//   ProviderResult,
//   ThemeIcon,
//   TreeDataProvider,
//   TreeItem,
//   TreeItemCollapsibleState,
//   Uri,
// } from 'vscode';
// import HostContext from '../../context/HostContext';
// import { IDirtyAsset } from '../../models/Project';
// import { RES_DIR_PATH } from '../../constants';

// enum CommitNode {
//   Changes = 1,
//   StagedChanges = 2,
// }

// export default class CommitViewDataProvider
//   implements TreeDataProvider<IDirtyAsset | CommitNode>
// {
//   static _singleton: CommitViewDataProvider;

//   static get instance() {
//     if (!this._singleton) {
//       this._singleton = new CommitViewDataProvider();
//     }
//     return this._singleton;
//   }

//   private _dataChangedEventEmitter = new EventEmitter<void>();
//   onDidChangeTreeData?: Event<void | IDirtyAsset | IDirtyAsset[]>;

//   private _changes?: IDirtyAsset[];
//   private _stagedChanges?: IDirtyAsset[];

//   private constructor() {
//     this.onDidChangeTreeData = this._dataChangedEventEmitter.event;
//   }

//   getChildren(
//     element?: IDirtyAsset | CommitNode
//   ): ProviderResult<(IDirtyAsset | CommitNode)[]> {
//     const dirtyAssets = HostContext.userContext.dirtyAssets;
//     if (!dirtyAssets) return [];

//     if (!element) {
//       return [CommitNode.Changes, CommitNode.StagedChanges];
//     } else {
//       if (<CommitNode>element === CommitNode.Changes) {
//         if (!this._changes) {
//           this._changes = dirtyAssets;
//         }
//         return this._changes;
//       } else {
//         return this._stagedChanges;
//       }
//     }
//   }

//   getTreeItem(
//     element: IDirtyAsset | CommitNode
//   ): TreeItem | Thenable<TreeItem> {
//     if (<CommitNode>element === CommitNode.Changes) {
//       const item = new TreeItem('Changes');
//       item.collapsibleState = TreeItemCollapsibleState.Expanded;
//       return item;
//     } else if (<CommitNode>element === CommitNode.StagedChanges) {
//       if (this._stagedChanges?.length) {
//         const item = new TreeItem('Staged Changes');
//         item.collapsibleState = TreeItemCollapsibleState.Collapsed;
//         return item;
//       }
//     } else {
//       return this.getItemFromAsset(<IDirtyAsset>element);
//     }
//   }

//   private getItemFromAsset(element: IDirtyAsset) {
//     const item = new TreeItem(element.asset.data.name);
//     item.id = element.asset.id;
//     item.iconPath =
//       element.asset.type === 'Shader'
//         ? Uri.joinPath(Uri.file(RES_DIR_PATH), 'icons', 'shader.svg')
//         : Uri.joinPath(Uri.file(RES_DIR_PATH), 'icons', 'script.svg');
//     item.tooltip = element.asset.getLocalPath();
//     item.contextValue = 'asset';

//     return item;
//   }

//   refresh() {
//     this._changes = undefined;
//     this._stagedChanges = undefined;
//     this._dataChangedEventEmitter.fire();
//   }
// }
