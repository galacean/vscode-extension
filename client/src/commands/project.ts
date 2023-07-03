import { ExtensionContext, FileChangeType, Uri, commands } from 'vscode';
import { ProjectListDataChangeEvent } from '../data/project';
import { getProjectFSProvider } from '@/TextDocProvider';

export function CommandUpdateProjectList(context: ExtensionContext) {
  return commands.registerCommand('galacean.update.project.list', async () => {
    // ProjectListDataChangeEvent.fire();
    const fsProvider = getProjectFSProvider();
    fsProvider._fileChangeEventEmitter.fire([
      { type: FileChangeType.Changed, uri: fsProvider.rootUri },
    ]);
  });
}

export function CommandProjectClick(context: ExtensionContext) {
  return commands.registerCommand('galacean.project.click', (uri: Uri) => {
    getProjectFSProvider().currentDir = uri;
  });
}
