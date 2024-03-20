import { ProgressLocation, window } from 'vscode';
import HostContext from '../context/HostContext';
import Project from '../models/Project';
import { fetchProjectList } from '../utils/request';
import Command from './Command';

export default class PullProjectList extends Command {
  name: string = 'galacean.pull.project_list';

  async callback() {
    await window.withProgress(
      { location: ProgressLocation.Notification, title: 'pulling' },
      async () => {
        HostContext.userContext.projectList = (
          await fetchProjectList(0, 10)
        ).list.map((item) => new Project(item));
      }
    );

    window.showInformationMessage('Successfully pulled the project list');
  }
}
