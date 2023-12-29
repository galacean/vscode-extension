import Command from './Command';
import AssetChangesViewProvider, {
  IAssetChange,
} from '../providers/viewData/AssetChangesViewProvider';

export default class RemoveAssetChange extends Command {
  name: string = 'galacean.scm.remove';
  callback(change: IAssetChange) {
    AssetChangesViewProvider.instance.removeStagedChange(change);
  }
}
