import { ProgressLocation, window } from 'vscode';
import Command from './Command';
import { exec } from 'child_process';
import HostContext from '../context/HostContext';
import { join } from 'path';
import { existsSync } from 'fs';

export default class NpmInstall extends Command {
  static command: string = 'galacean.npm.install';
  name: string = 'galacean.npm.install';

  async callback() {
    const project = HostContext.userContext.openedProject;
    if (!project) {
      window.showErrorMessage('not in galacean project workspace');
      return;
    }
    const projectPath = project.getLocalPath();
    const pkgJsonPath = join(projectPath, 'package.json');
    if (!existsSync(pkgJsonPath)) return;

    window.withProgress(
      { location: ProgressLocation.Notification, title: 'Package Installing' },
      async () => {
        await this.install(projectPath);
        window.showInformationMessage('Package installation complete.');
      }
    );
  }

  private install(path: string) {
    return new Promise<void>((resolve, reject) => {
      exec(`cd ${path} && npm install && cd -`, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}
