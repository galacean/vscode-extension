import Command from './Command';
import { fetchProjectDetail } from '../request';
import HostContext from '../context/HostContext';
import LocalFileManager from '../controllers/LocalFileManager';
import { Uri, commands, window } from 'vscode';
import { EViewID } from '../constants';

export default class OpenProject extends Command {
  static command = 'galacean.open.project';
  name: string = 'galacean.open.project';

  async callback(projectId: string) {
    const userContext = HostContext.userContext;

    const project = userContext.getProjectById(projectId);
    const assets = LocalFileManager.instance.readProjectFiles(
      userContext.userId,
      project
    );
    if (assets?.length === 0) {
      await window.withProgress(
        { location: { viewId: EViewID.ProjectList }, title: 'syncing' },
        async () => {
          const projectData = await fetchProjectDetail(projectId);
          await userContext.setCurrentProject(projectData);
        }
      );
    }
    commands.executeCommand(
      'vscode.openFolder',
      Uri.file(
        project.getLocalPath(LocalFileManager.localRootPath, userContext.userId)
      )
    );
  }
}
