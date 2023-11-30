import Command from './Command';
import HostContext from '../context/HostContext';
import { Uri, commands, window } from 'vscode';
import { EViewID } from '../constants';

export default class OpenProject extends Command {
  static command = 'galacean.open.project';
  name: string = 'galacean.open.project';

  async callback(projectId: string) {
    const userContext = HostContext.userContext;

    const project = userContext.getProjectById(projectId);
    if (!project) {
      throw 'project not found';
    }

    if (!project.assetsInitialized) {
      await window.withProgress(
        {
          location: { viewId: EViewID.ProjectList },
          title: 'pulling',
        },
        project.initAssets
      );
    }

    userContext.openedProject = project;

    await commands.executeCommand(
      'vscode.openFolder',
      Uri.file(project.getLocalPath())
    );
    commands.executeCommand('workbench.view.explorer');
  }
}
