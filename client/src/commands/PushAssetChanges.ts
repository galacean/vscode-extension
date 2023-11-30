import { ProgressLocation, window } from 'vscode';
import HostContext from '../context/HostContext';
import Command from './Command';
import AssetSourceController from '../controllers/AssetSourceController';
import { updateAsset } from '../utils';
import { readFileSync } from 'fs';
import Asset from '../models/Asset';

export default class PushAssetChanges extends Command {
  name: string = 'galacean.scm.push';

  async callback() {
    const stagedChanges = AssetSourceController.instance.stagedChanges;
    if (stagedChanges.length === 0) {
      window.showWarningMessage('No staged changes.');
      return;
    }
    const success = [],
      fail: Asset[] = [];
    await window.withProgress(
      { location: ProgressLocation.SourceControl, title: 'syncing' },
      async () => {
        return Promise.all(
          stagedChanges.map(async (source) => {
            const asset =
              HostContext.userContext.openedProject.findAssetByLocalPath(
                source.resourceUri.path
              );
            const localContent = readFileSync(source.resourceUri.path);

            return updateAsset(asset, localContent)
              .then(async (newAsset) => {
                await asset.updateData(newAsset);
                success.push(asset);
              })
              .catch((e) => {
                console.error(e);
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
      ? window.showErrorMessage(info)
      : window.showInformationMessage(info);
  }
}
