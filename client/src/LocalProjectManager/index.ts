import { Uri, commands, languages } from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { TEMPLATE_DIR_PATH } from '@/constants';
import { getProjectFSProvider } from '@/FSDocProvider';

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
    if (fs.existsSync(projectTempDirPath)) {
      const fsProvider = getProjectFSProvider();
      const content = await fsProvider.readFile(gUri);
      const name = path.basename(gUri.path);
      fs.writeFileSync(path.join(projectTempDirPath, 'src', name), content, {
        flag: 'w+',
      });
    }
  }

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
      // fs.rmSync(projectTempDirPath, { recursive: true, force: true });
      // fs.mkdirSync(projectTempDirPath, { recursive: true });

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
    }

    commands.executeCommand('vscode.openFolder', projectInfo.localTempUri);
    // Focus on file explorer view
    commands.executeCommand('workbench.explorer.fileView.focus');
  }
}
