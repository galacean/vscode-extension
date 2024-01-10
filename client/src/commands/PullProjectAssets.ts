import { ProgressLocation, window } from 'vscode';
import Command from './Command';
import HostContext from '../context/HostContext';

let syncing = false;

export default class PullProjectAssets extends Command {
  static command = 'galacean.pull.projectAssets';
  name: string = 'galacean.pull.projectAssets';

  async callback() {
    const project = HostContext.userContext.openedProject;
    if (!project) {
      window.showWarningMessage('No project opened');
    }
    if (!project || syncing) return;

    syncing = true;
    HostContext.userContext.uiController.showSyncStatusBar(true);
    window.withProgress(
      { location: ProgressLocation.Notification, title: 'syncing' },
      async () => {
        await project
          .updateAssetsFromServer()
          .then(() => {
            window.showInformationMessage(
              'Successfully pulled the project asset list'
            );
          })
          .catch((e) => {
            window.showErrorMessage(e);
          });

        syncing = false;
        HostContext.userContext.uiController.showSyncStatusBar(false);
      }
    );
  }
}
