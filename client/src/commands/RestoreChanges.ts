import { Uri, workspace } from 'vscode';
import Command from './Command';
import HostContext from '../context/HostContext';
import { writeFileSync } from 'fs';
import { IAssetChange } from '../providers/viewData/AssetChangesViewProvider';

export default class RestoreChanges extends Command {
  name: string = 'galacean.scm.restore';

  callback(change: IAssetChange) {
    const openedProject = HostContext.userContext.openedProject;
    const assetPath = change.path;

    const asset = openedProject.findAssetByLocalPath(assetPath);
    if (asset) {
      writeFileSync(assetPath, asset.content);
    } else {
      workspace.fs.delete(Uri.file(assetPath));
    }
  }
}
