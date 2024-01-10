import { window } from 'vscode';
import HostContext from '../context/HostContext';
import Command from './Command';

let requesting = false;

export default class MoreProjects extends Command {
  static command = 'galacean.more.projects';
  name: string = 'galacean.more.projects';

  async callback(...args: any[]) {
    if (requesting === true) return;
    requesting = true;
    await window.withProgress(
      { location: { viewId: 'project-list' }, title: 'fetching ...' },
      () => {
        return HostContext.userContext.fetchMoreProjectList();
      }
    );
    requesting = false;
  }
}
