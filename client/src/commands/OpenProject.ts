import Command from './Command';
import HostContext from '../context/HostContext';
import { Uri, commands, window } from 'vscode';
import { EViewID } from '../constants';
import AssetChangesViewProvider from '../providers/viewData/AssetChangesViewProvider';

export default class OpenProject extends Command {
  static command = 'galacean.open.project';
  name: string = 'galacean.open.project';

  async callback(projectId: string) {
    const userContext = HostContext.userContext;

    if (
      userContext.openedProject &&
      projectId === userContext.openedProject.data.id.toString()
    ) {
      return;
    }

    const project = userContext.getProjectById(projectId);
    if (!project) {
      throw 'project not found';
    }

    AssetChangesViewProvider.instance.clear();

    if (!project.assetsInitialized) {
      await window.withProgress(
        {
          location: { viewId: EViewID.ProjectList },
          title: 'pulling',
        },
        project.initAssets.bind(project)
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
