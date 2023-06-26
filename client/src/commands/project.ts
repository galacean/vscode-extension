import { ExtensionContext, commands } from 'vscode';
import { getProjectList } from '../request/project';
import { updateProjectListData } from '../data/project';

export function CommandUpdateProjectList(content: ExtensionContext) {
  return commands.registerCommand('galacean.update.project.list', async () => {
    const res = await getProjectList();
    updateProjectListData(res.data.data.list, false);
  });
}
