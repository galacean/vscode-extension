import { window } from 'vscode';
import HostContext from '../context/HostContext';
import LocalFileManager from '../models/LocalFileManager';
import Project from '../models/Project';
import Command from './Command';
import { EViewID } from '../constants';

export default class PushProjectAssets extends Command {
  name: string = 'galacean.push.project';

  async callback(project: Project) {
    if (!project.assetsInitialized) {
      await window.withProgress(
        {
          location: { viewId: EViewID.ProjectList },
          title: 'pulling',
        },
        project.initAssets
      );
    }
    HostContext.userContext.setPushProject(project);
  }
}
