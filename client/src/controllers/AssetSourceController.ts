import {
  ExtensionContext,
  FileSystemWatcher,
  SourceControl,
  SourceControlResourceGroup,
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
import {
  existsSync,
  promises as fsPromise,
  readFileSync,
  writeFileSync,
} from 'fs';
import LocalFileManager from '../models/LocalFileManager';

enum EFileChange {
  DELETE,
  CHANGE,
  CREATE,
  NONE,
}

interface ISource {
  localPath: string;
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
  private _changesGroup: SourceControlResourceGroup;
  private _stagedChangesGroup: SourceControlResourceGroup;
  private _fsWatcher: FileSystemWatcher;

  get stagedChanges() {
    return this._stagedChangesGroup.resourceStates;
  }

  private constructor(context: ExtensionContext, rootUri?: Uri) {
    this._scm = scm.createSourceControl('galacean', 'Asset', rootUri);
    this._stagedChangesGroup = this._scm.createResourceGroup(
      'staged',
      'Staged Changes'
    );
    this._stagedChangesGroup.hideWhenEmpty = true;
    this._changesGroup = this._scm.createResourceGroup('change', 'Changes');
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
      '**/{*,!node_modules,!.git,!.vscode}/*.{ts,shader}'
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
      .map((localAsset) => ({
        localPath: localAsset,
        state: EFileChange.CREATE,
      }));

    await Promise.all(
      localSourceList.map(async (localSource) => {
        const remoteAsset = openedProject.findAssetByName(
          basename(localSource.localPath)
        );
        if (remoteAsset) {
          localSource.asset = remoteAsset;
          const localContent = (
            await fsPromise.readFile(localSource.localPath)
          ).toString();
          if (localContent === remoteAsset.content) {
            localSource.state = EFileChange.NONE;
          } else {
            localSource.state = EFileChange.CHANGE;
          }
        }
      })
    );

    const stagedUrls = this.getStagedFiles();

    const localUriList = localSourceList.map((item) => item.localPath);
    const deleteAssets = openedProject.assets.filter((item) => {
      return !localUriList.includes(item.localPath);
    });
    for (const source of localSourceList.filter(
      (item) => item.state !== EFileChange.NONE
    )) {
      const state = this.addChange(
        Uri.parse(source.localPath),
        false,
        source.asset
      );
      if (stagedUrls.includes(source.localPath)) {
        this.addStagedChange(state);
      }
    }
    for (const asset of deleteAssets) {
      const state = this.addChange(asset.localUri, true, asset);
      if (stagedUrls.includes(asset.localPath)) {
        this.addStagedChange(state);
      }
    }
  }

  private async onSourceChanged(uri: Uri, change: EFileChange) {
    const filename = basename(uri.path);
    const asset =
      HostContext.userContext.openedProject.findAssetByName(filename);
    if (!asset) {
      if (change === EFileChange.DELETE) {
        this.removeChange(uri);
      } else {
        this.addChange(uri, true);
      }
    } else {
      const document = await workspace.openTextDocument(uri);
      if (document.getText() === asset.content) {
        this.removeChange(uri);
        const stagedState = this._stagedChangesGroup.resourceStates.find(
          (item) => item.resourceUri.toString() === uri.toString()
        );
        if (stagedState) {
          this._removeStagedChange(stagedState);
        }
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
    return curState;
  }

  private removeChange(uri: Uri) {
    const states = this._changesGroup.resourceStates;

    let index = states.findIndex(
      (item) => item.resourceUri.toString() === uri.toString()
    );
    if (index !== -1) {
      states.splice(index, 1);
    }

    this._changesGroup.resourceStates = states;
  }

  addStagedChange(resourceState: SourceControlResourceState) {
    this.removeChange(resourceState.resourceUri);
    const stats = this._stagedChangesGroup.resourceStates;
    stats.push(resourceState);
    this._stagedChangesGroup.resourceStates = stats;

    this.updateStagedMetaFile(resourceState.resourceUri.path, 'add');
  }

  removeStagedChange(resourceState: SourceControlResourceState) {
    const changeStates = this._changesGroup.resourceStates;
    changeStates.push(resourceState);
    this._changesGroup.resourceStates = changeStates;

    this._removeStagedChange(resourceState);
  }

  private _removeStagedChange(resourceState: SourceControlResourceState) {
    const stageStates = this._stagedChangesGroup.resourceStates;
    const index = stageStates.findIndex((item) => item === resourceState);
    stageStates.splice(index, 1);
    this._stagedChangesGroup.resourceStates = stageStates;

    this.updateStagedMetaFile(resourceState.resourceUri.path, 'remove');
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
}
