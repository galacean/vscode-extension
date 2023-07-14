import { ProgressLocation, Uri, commands, window } from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { TEMPLATE_DIR_PATH } from '@/constants';
import { getProjectFSProvider } from '@/FSDocProvider';
import { exec } from 'child_process';

export class LocalProjectManager {
  private static _uriMap: Map<string, { fsUri: Uri; localTempUri: Uri }> =
    new Map();

  static _tmpDir = os.tmpdir();

  static getProjectInfo(projectUri: string | Uri) {
    return this._uriMap.get(projectUri.toString());
  }

  static getProjectTempPath(projectId) {
    return path.join(this._tmpDir, 'galacean', projectId);
  }

  static async writeScriptLocally(gUri: Uri) {
    const projectId = path.basename(path.dirname(gUri.path));
    const projectTempDirPath = this.getProjectTempPath(projectId);
    let localUriString: string;
    if (fs.existsSync(projectTempDirPath)) {
      const fsProvider = getProjectFSProvider();
      const content = await fsProvider.readFile(gUri);
      const name = path.basename(gUri.path);
      localUriString = path.join(projectTempDirPath, 'src', name);
      fs.writeFileSync(localUriString, content, {
        flag: 'w+',
      });
    }
    return localUriString;
  }

  static async deleteScriptLocally(gUri: Uri) {
    const projectId = path.basename(path.dirname(gUri.path));
    const projectTempDirPath = this.getProjectTempPath(projectId);
    const name = path.basename(gUri.path);
    fs.rmSync(path.join(projectTempDirPath, 'src', name));
  }

  /**
   * @returns Local temporary uri
   */
  static async openProjectLocally(projectUri: Uri) {
    const projectUriString = projectUri.toString();
    let projectInfo = LocalProjectManager._uriMap.get(projectUriString);
    if (!projectInfo) {
      const projectId = path.basename(projectUri.path);
      const projectTempDirPath = this.getProjectTempPath(projectId);
      if (!fs.existsSync(projectTempDirPath)) {
        fs.mkdirSync(projectTempDirPath, { recursive: true });
      } else {
        fs.rmSync(path.join(projectTempDirPath, 'src'), {
          recursive: true,
          force: true,
        });
      }

      // copy templates
      const projectTemplateDirPath = path.join(TEMPLATE_DIR_PATH, 'project');
      fs.cpSync(projectTemplateDirPath, projectTempDirPath, {
        recursive: true,
      });

      // copy scripts only
      const fsProvider = getProjectFSProvider();
      const files = fsProvider.readDirectory(projectUri);
      for (const [name, _] of files) {
        if (path.extname(name) === '.ts') {
          this.writeScriptLocally(Uri.joinPath(projectUri, name));
        }
      }

      projectInfo = {
        fsUri: projectUri,
        localTempUri: Uri.file(projectTempDirPath),
      };
      LocalProjectManager._uriMap.set(projectUriString, projectInfo);

      // Prompt the user to install dependency
      if (!fs.existsSync(path.join(projectTempDirPath, 'node_modules'))) {
        window
          .showInformationMessage(
            'Install dependencies ?',
            { modal: true },
            'Yes'
          )
          .then((ans) => {
            if (ans === 'Yes') {
              window.withProgress(
                {
                  location: ProgressLocation.Notification,
                  title: 'Installing',
                },
                (progress, token) => {
                  let current = 0;
                  const offset = 1;
                  const interval = setInterval(() => {
                    if (current < 99) {
                      current += offset;
                      progress.report({ increment: offset });
                    } else {
                      clearInterval(interval);
                    }
                  }, 100);
                  return new Promise((res, rej) => {
                    exec(
                      `cd ${projectTempDirPath} && npm install && cd -`,
                      (err, stdout, stderr) => {
                        if (err) {
                          rej(err);
                        }
                        process.stdout.write(stdout);
                        process.stderr.write(stderr);
                        clearInterval(interval);
                        window.showInformationMessage(stdout);
                        res('ok');
                      }
                    );
                  });
                }
              );
            }
          });
      }
    }

    commands.executeCommand('vscode.openFolder', projectInfo.localTempUri);
    // Focus on file explorer view
    commands.executeCommand('workbench.explorer.fileView.focus');
    return projectInfo.localTempUri;
  }
}
