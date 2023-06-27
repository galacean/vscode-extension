import { ExtensionContext, commands } from 'vscode';
import { ProjectListDataChangeEvent } from '../data/project';

export function CommandUpdateProjectList(content: ExtensionContext) {
  return commands.registerCommand('galacean.update.project.list', async () => {
    ProjectListDataChangeEvent.fire();
  });
}
