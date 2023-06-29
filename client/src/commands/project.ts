import { ExtensionContext, commands } from 'vscode';
import { ProjectListDataChangeEvent } from '../data/project';

export function CommandUpdateProjectList(context: ExtensionContext) {
  return commands.registerCommand('galacean.update.project.list', async () => {
    ProjectListDataChangeEvent.fire();
  });
}
