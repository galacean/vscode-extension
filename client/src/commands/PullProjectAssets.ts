import { window } from 'vscode';
import Project from '../models/Project';
import Command from './Command';
import { EViewID } from '../constants';
import HostContext from '../context/HostContext';

let syncing = false;

export default class PullProjectAssets extends Command {
  name: string = 'galacean.pull.projectAssets';

  async callback() {
    const project = HostContext.userContext.openedProject;
    if (!project) {
      window.showWarningMessage('No project opened');
    }
    if (!project || syncing) return;

    syncing = true;
    window.withProgress(
      { location: { viewId: EViewID.ProjectList }, title: 'syncing' },
      async () => {
        await project
          .updateAssetsFromServer(false)
          .then(() => {
            window.showInformationMessage(
              'Successfully pulled the project asset list'
            );
          })
          .catch((e) => {
            window.showErrorMessage(e);
          });

        syncing = false;
      }
    );
  }
}
