import { ProgressLocation, window } from 'vscode';
import HostContext from '../context/HostContext';
import Command from './Command';
import { updateAsset } from '../utils';
import { readFileSync } from 'fs';
import Asset from '../models/Asset';
import AssetChangesViewProvider from '../providers/viewData/AssetChangesViewProvider';

export default class PushAssetChanges extends Command {
  name: string = 'galacean.scm.push';

  async callback() {
    const stagedChanges = AssetChangesViewProvider.instance.stagedChanges;
    if (stagedChanges.length === 0) {
      window.showWarningMessage('No staged changes.');
      return;
    }
    const success = [],
      fail: Asset[] = [];
    let traceId = '';
    await window.withProgress(
      { location: ProgressLocation.SourceControl, title: 'syncing' },
      async () => {
        return Promise.all(
          stagedChanges.map(async (stagedChange) => {
            const asset =
              HostContext.userContext.openedProject.findAssetByLocalPath(
                stagedChange.path
              );
            const localContent = readFileSync(stagedChange.path);

            return updateAsset(asset, localContent)
              .then(async (newAsset) => {
                await asset.updateData(newAsset);
                success.push(asset);
                AssetChangesViewProvider.instance.removeStagedChange(
                  stagedChange
                );
                AssetChangesViewProvider.instance.refresh();
              })
              .catch((e) => {
                console.error(e);
                traceId = e.data?.traceId;
                fail.push(asset);
              });
          })
        );
      }
    );

    let info = '';
    if (success.length > 0) {
      info += `succeed to update ${success.length} assets;`;
    }
    if (fail.length > 0) {
      info += `failed to update assets: ${fail
        .map((i) => i.data.name)
        .join('; ')}`;
    }
    fail.length > 0
      ? window.showErrorMessage(info, { detail: `traceId: ${traceId}` })
      : window.showInformationMessage(info);
  }
}
