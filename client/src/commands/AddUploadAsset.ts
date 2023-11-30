import { IDirtyAsset } from '../models/Project';
import Command from './Command';

export default class AddUploadAsset extends Command {
  name: string = 'galacean.add.uploadAsset';

  callback(asset: IDirtyAsset) {
    console.log(asset);
  }
}
