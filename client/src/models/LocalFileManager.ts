import HostContext from '../context/HostContext';
import { homedir } from 'os';
import { dirname, join, extname, basename } from 'path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from 'fs';
import Project from './Project';
import Asset from './Asset';
import { RES_DIR_PATH, SERVER_HOST } from '../constants';

export default class LocalFileManager {
  static _singleton: LocalFileManager;

  static get localRootPath() {
    return this.instance.localRootPath;
  }

  static get instance() {
    if (!this._singleton) {
      this._singleton = new LocalFileManager();
    }
    return this._singleton;
  }

  static metaFileName = '.meta';
  static get stagedChangeMetaFilePath() {
    return join(this._singleton.localRootPath, '.staged');
  }

  private localRootPath: string;

  constructor() {
    this.localRootPath =
      HostContext.instance.getConfig('root') ||
      join(homedir(), 'galacean', SERVER_HOST);
    if (!existsSync(this.localRootPath)) {
      mkdirSync(this.localRootPath, { recursive: true });
    }
  }

  static updateProjectPkgJson(
    userId: string,
    project: Project,
    info?: IPkgInfo
  ) {
    const projectPath = project.getLocalPath(
      LocalFileManager.localRootPath,
      userId
    );
    const pkgJsonPath = join(projectPath, 'package.json');
    let pkgInfo: Record<string, any>;
    if (existsSync(pkgJsonPath)) {
      pkgInfo = JSON.parse(readFileSync(pkgJsonPath).toString());
    } else {
      pkgInfo = JSON.parse(
        readFileSync(join(RES_DIR_PATH, 'template/package.json')).toString()
      );
    }
    pkgInfo.author = HostContext.userContext.userInfo.name;
    if (info?.dependencies) {
      Object.assign(pkgInfo.dependencies, info.dependencies);
    }
    if (info?.other) {
      Object.assign(pkgInfo, info.other);
    }
    writeFileSync(pkgJsonPath, JSON.stringify(pkgInfo, null, 2));
  }

  static updateAsset(asset: Asset, localSync = true) {
    const assetDirPath = dirname(asset.localPath);

    if (!existsSync(assetDirPath)) {
      mkdirSync(assetDirPath, { recursive: true });
    }
    const assetMetaPath = asset.localMetaPath;
    const assetMetaDirPath = dirname(assetMetaPath);
    if (!existsSync(assetMetaDirPath)) {
      mkdirSync(assetMetaDirPath, { recursive: true });
    }

    writeFileSync(assetMetaPath, JSON.stringify(asset.localMeta));
    if (localSync) writeFileSync(asset.localPath, asset.content);
  }

  /** @returns absolute path list */
  static readProjectFiles(
    project: Project,
    opts: {
      meta: boolean;
      userId?: string;
      extensions?: string[];
      blackList?: string[];
    }
  ) {
    function readDir(path: string, result: string[] = []) {
      const entries = readdirSync(path, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = join(path, entry.name);
        if (entry.isFile()) {
          if (!opts.meta && entry.name.endsWith(LocalFileManager.metaFileName))
            continue;
          if (
            opts?.extensions &&
            !opts?.extensions.includes(extname(entry.name))
          )
            continue;
          if (opts?.blackList && opts.blackList.includes(basename(entry.name)))
            continue;

          result.push(entryPath);
        } else if (!['node_modules', '.git', '.vscode'].includes(entry.name)) {
          readDir(entryPath, result);
        }
      }
      return result;
    }

    const projectPath = opts.meta
      ? project.getLocalMetaDirPath(this.localRootPath, opts.userId)
      : project.getLocalPath(this.localRootPath, opts.userId);
    mkdirSync(projectPath, { recursive: true });
    return readDir(projectPath);
  }

  static async readUserProjectListFromLocal() {
    const projectListMetaFilePath =
      HostContext.userContext.getUserProjectListMetaFilePath();
    const projectList = JSON.parse(
      readFileSync(projectListMetaFilePath).toString()
    ) as IProject[];
    return projectList.map((item) => new Project(item));
  }

  static async readUserInfoFromLocal() {
    const userInfoMetaPath = HostContext.userContext.getUserInfoMetaFilePath();
    return JSON.parse(readFileSync(userInfoMetaPath).toString()) as IUserInfo;
  }

  static existAsset(asset: Asset) {
    return existsSync(asset.localPath);
  }

  static existProject(project: Project) {
    return existsSync(project.getLocalPath(this.localRootPath));
  }

  static getUserDirPath(userId: string) {
    return join(this.localRootPath, userId);
  }

  static existUserProjectList() {
    return existsSync(HostContext.userContext.getUserProjectListMetaFilePath());
  }

  static existUser() {
    return existsSync(HostContext.userContext.getUserInfoMetaFilePath());
  }

  static writeFile(filePath: string, content: string) {
    const dirPath = dirname(filePath);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath);
    }
    writeFileSync(filePath, content);
  }
}
