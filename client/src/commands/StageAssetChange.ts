import Command from './Command';
import AssetChangesViewProvider, {
  IAssetChange,
} from '../providers/viewData/AssetChangesViewProvider';

export default class StageAssetChange extends Command {
  name: string = 'galacean.scm.add';
  callback(change: IAssetChange) {
    AssetChangesViewProvider.instance.addStagedChange(change);
  }
}
