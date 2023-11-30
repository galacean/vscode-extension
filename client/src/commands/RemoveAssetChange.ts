import { SourceControlResourceState } from 'vscode';
import Command from './Command';
import AssetSourceController from '../controllers/AssetSourceController';

export default class RemoveAssetChange extends Command {
  name: string = 'galacean.scm.remove';
  callback(resourceState: SourceControlResourceState) {
    AssetSourceController.instance.removeStagedChange(resourceState);
  }
}
