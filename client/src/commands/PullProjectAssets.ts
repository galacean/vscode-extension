import { window } from 'vscode';
import Project from '../models/Project';
import Command from './Command';
import { EViewID } from '../constants';

let syncing = false;

export default class PullProjectAssets extends Command {
  name: string = 'galacean.pull.project';

  async callback(project: Project) {
    if (!project || syncing) return;

    syncing = true;
    window.withProgress(
      { location: { viewId: EViewID.ProjectList }, title: 'syncing' },
      async () => {
        await project.updateAssetsFromServer();

        syncing = false;
        window.showInformationMessage(
          'Successfully pulled the project asset list'
        );
      }
    );
  }
}
