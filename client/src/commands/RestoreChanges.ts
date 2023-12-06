import { SourceControlResourceState, workspace } from 'vscode';
import Command from './Command';
import HostContext from '../context/HostContext';
import { writeFileSync, promises as fsPromise } from 'fs';

export default class RestoreChanges extends Command {
  name: string = 'galacean.scm.restore';

  callback(resourceState: SourceControlResourceState) {
    const openedProject = HostContext.userContext.openedProject;
    const assetUri = resourceState.resourceUri;

    const asset = openedProject.findAssetByLocalPath(assetUri.path);
    if (asset) {
      writeFileSync(assetUri.path, asset.content);
    } else {
      workspace.fs.delete(assetUri);
    }
  }
}
