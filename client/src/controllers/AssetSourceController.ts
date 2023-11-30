import {
  ExtensionContext,
  FileSystemWatcher,
  SourceControl,
  SourceControlResourceGroup,
  StatusBarItem,
  Uri,
  scm,
  workspace,
  SourceControlResourceState,
} from 'vscode';
import AssetDiffProvider from '../providers/AssetDiffProvider';
import { GALACEAN_ASSET_SCHEMA } from '../constants';
import { AssetOriginContentProvider } from '../providers/AssetOriginContentProvider';
import { basename } from 'path';
import HostContext from '../context/HostContext';
import Asset from '../models/Asset';
import { promises as fsPromise } from 'fs';

enum EFileChange {
  DELETE,
  CHANGE,
  CREATE,
  NONE,
}

interface ISource {
  uri: string;
  state: EFileChange | 'not changed';
  asset?: Asset;
}

export default class AssetSourceController {
  static instance: AssetSourceController;
  static init(context: ExtensionContext, rootUri?: Uri) {
    if (!this.instance) {
      this.instance = new AssetSourceController(context, rootUri);
    }

    return this.instance;
  }

  private _scm: SourceControl;
  private _commitButton: StatusBarItem;
  private _changesGroup: SourceControlResourceGroup;
  private _stagedChangesGroup: SourceControlResourceGroup;
  private _fsWatcher: FileSystemWatcher;

  private constructor(context: ExtensionContext, rootUri?: Uri) {
    this._scm = scm.createSourceControl('galacean', 'Asset', rootUri);
    this._changesGroup = this._scm.createResourceGroup('change', 'Changes');
    this._stagedChangesGroup = this._scm.createResourceGroup(
      'staged',
      'Staged Changes'
    );
    this._scm.quickDiffProvider = new AssetDiffProvider();
    this._scm.inputBox.visible = false;

    context.subscriptions.push(
      workspace.registerTextDocumentContentProvider(
        GALACEAN_ASSET_SCHEMA,
        new AssetOriginContentProvider()
      )
    );
    context.subscriptions.push(this._scm);
    this.initFSWatcher(context);

    this.initChanges();
  }

  private initFSWatcher(context: ExtensionContext) {
    this._fsWatcher = workspace.createFileSystemWatcher(
      '**/{*,!node_modules,!.git}/*.{ts,shader}'
    );
    context.subscriptions.push(this._fsWatcher);
    this._fsWatcher.onDidChange((uri) =>
      this.onSourceChanged(uri, EFileChange.CHANGE)
    );
    this._fsWatcher.onDidCreate((uri) =>
      this.onSourceChanged(uri, EFileChange.CHANGE)
    );
    this._fsWatcher.onDidDelete((uri) =>
      this.onSourceChanged(uri, EFileChange.DELETE)
    );
  }

  async initChanges() {
    const openedProject = HostContext.userContext.openedProject;
    const localSourceList: ISource[] = openedProject
      .getLocalAssetFiles()
      .map((localAsset) => ({ uri: localAsset, state: EFileChange.CREATE }));

    await Promise.all(
      localSourceList.map(async (localSource) => {
        const remoteAsset = openedProject.findAssetByName(
          basename(localSource.uri)
        );
        if (remoteAsset) {
          localSource.asset = remoteAsset;
          const localContent = (
            await fsPromise.readFile(localSource.uri)
          ).toString();
          if (localContent === remoteAsset.content) {
            localSource.state = EFileChange.NONE;
          } else {
            localSource.state = EFileChange.CHANGE;
          }
        }
      })
    );

    const localUriList = localSourceList.map((item) => item.uri);
    const deleteAssets = openedProject.assets.filter((item) => {
      return !localUriList.includes(item.localUri.path);
    });
    for (const source of localSourceList.filter(
      (item) => item.state !== EFileChange.NONE
    )) {
      this.addChange(Uri.parse(source.uri), false, source.asset);
    }
    for (const asset of deleteAssets) {
      this.addChange(asset.localUri, true, asset);
    }
  }

  private async onSourceChanged(uri: Uri, change: EFileChange) {
    const filename = basename(uri.path);
    const asset =
      HostContext.userContext.openedProject.findAssetByName(filename);
    if (!asset) {
      if (change === EFileChange.DELETE) {
        this.removeChange(uri, true);
      } else {
        this.addChange(uri, true);
      }
    } else {
      const document = await workspace.openTextDocument(uri);
      if (document.getText() === asset.content) {
        this.removeChange(uri, false);
      } else {
        this.addChange(uri, false, asset);
      }
    }
  }

  private addChange(uri: Uri, isDelete: boolean, asset?: Asset) {
    const states = this._changesGroup.resourceStates;

    let curState = states.find(
      (item) => item.resourceUri.toString() === uri.toString()
    );
    const updateState = () => {
      curState = {
        resourceUri: uri,
        decorations: isDelete
          ? { strikeThrough: true, tooltip: 'File was locally deleted.' }
          : undefined,
        command: {
          title: 'Show changes',
          command: 'vscode.diff',
          tooltip: 'Diff your changes',
          arguments: [
            asset?.galaceanUri ??
              Uri.from({ scheme: GALACEAN_ASSET_SCHEMA, path: '-1' }),
            uri,
            'Server ↔ Local changes',
          ],
        },
      };
    };
    if (!curState) {
      updateState();
      states.push(curState);
    } else {
      updateState();
    }

    this._changesGroup.resourceStates = states;
  }

  private removeChange(uri: Uri, isDelete: boolean) {
    const states = this._changesGroup.resourceStates;

    let index = states.findIndex(
      (item) => item.resourceUri.toString() === uri.toString()
    );
    if (index !== -1) {
      states.splice(index, 1);
    }

    this._changesGroup.resourceStates = states;
  }

  private addStagedChange(uri: Uri, isDelete: boolean, asset?: Asset) {}

  private removeStagedChange(uri: Uri, isDelete: boolean, asset?: Asset) {}
}
