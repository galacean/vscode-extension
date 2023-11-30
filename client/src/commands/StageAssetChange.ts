import { SourceControlResourceState } from 'vscode';
import Command from './Command';
import AssetSourceController from '../controllers/AssetSourceController';

export default class StageAssetChange extends Command {
  name: string = 'galacean.scm.add';
  callback(resourceState: SourceControlResourceState) {
    AssetSourceController.instance.addStagedChange(resourceState);
  }
}
