import { window } from 'vscode';
import HostContext from '../context/HostContext';
import Project from '../models/Project';
import { fetchProjectDetail } from '../request';
import Command from './Command';
import { EViewID } from '../constants';

let syncing = false;

export default class PullProjectAssets extends Command {
  name: string = 'galacean.pull.project';

  async callback(item: Project) {
    if (!item || syncing) return;

    syncing = true;
    window.withProgress(
      { location: { viewId: EViewID.ProjectList }, title: 'syncing' },
      async () => {
        const projectDetail = await fetchProjectDetail(item.data.id.toString());
        HostContext.userContext.setCurrentProject(projectDetail);

        syncing = false;
      }
    );
  }
}
