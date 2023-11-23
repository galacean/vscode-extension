import HostContext from '../context/HostContext';
import { homedir } from 'os';
import { dirname, join } from 'path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  Dirent,
} from 'fs';
import Project from '../models/Project';
import Asset from '../models/Asset';

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

  private localRootPath: string;

  private projectFileMetaMap = new Map<string, IProjectFileMeta>();
  private assetFileMetaMap = new Map<string, IAssetFileMeta>();

  constructor() {
    this.localRootPath =
      HostContext.instance.getConfig('root') || join(homedir(), 'galacean');
    if (!existsSync(this.localRootPath)) {
      mkdirSync(this.localRootPath, { recursive: true });
    }
  }

  readProjectMeta(userId: string, project: Project): IProjectFileMeta {
    const key = this._getProjectFileMapKey(userId, project.data.id.toString());
    let ret = this.projectFileMetaMap.get(key);
    if (!ret) {
      const projectPath = project.getLocalPath(this.localRootPath, userId);
      if (!existsSync(projectPath)) {
        mkdirSync(projectPath, { recursive: true });
        ret = { gmtCreate: new Date(0), gmtModified: new Date(0) };
      } else {
        const content = readFileSync(
          join(projectPath, LocalFileManager.metaFileName)
        ).toString();
        ret = JSON.parse(content);
      }
      this.projectFileMetaMap.set(key, ret);
    }
    return ret;
  }

  readAssetMeta(userId: string, asset: Asset): IAssetFileMeta {
    const key = this._getAssetFileMapKey(
      userId,
      asset.data.projectId.toString(),
      asset.id
    );
    let ret = this.assetFileMetaMap.get(key);
    if (!ret) {
      const assetLocalPath = asset.getLocalPath(this.localRootPath, userId);
      const assetMetaPath = `${assetLocalPath}${LocalFileManager.metaFileName}`;
      if (!existsSync(assetMetaPath)) {
        ret = { gmtCreate: new Date(0), gmtModified: new Date(0) };
      } else {
        const content = readFileSync(assetMetaPath).toString();
        ret = JSON.parse(content);
      }
      this.assetFileMetaMap.set(key, ret);
    }
    return ret;
  }

  updateProjectMeta(userId: string, projectId: string, meta: IProjectFileMeta) {
    const projectPath = join(this.localRootPath, userId, projectId);
    if (!existsSync(projectPath)) {
      mkdirSync(projectPath, { recursive: true });
    }
    writeFileSync(
      join(projectPath, LocalFileManager.metaFileName),
      JSON.stringify(meta)
    );
    this.projectFileMetaMap.set(
      this._getProjectFileMapKey(userId, projectId),
      meta
    );
  }

  updateAsset(userId: string, asset: Asset) {
    const assetLocalPath = asset.getLocalPath(this.localRootPath, userId);
    const assetDirPath = dirname(assetLocalPath);

    if (!existsSync(assetDirPath)) {
      mkdirSync(assetDirPath, { recursive: true });
    }
    const assetMetaPath = `${assetLocalPath}${LocalFileManager.metaFileName}`;
    const newMeta: IAssetFileMeta = {
      gmtCreate: new Date(asset.data.gmtCreate),
      gmtModified: new Date(asset.data.gmtModified),
      type: asset.type,
      md5: asset.md5,
    };
    writeFileSync(assetMetaPath, JSON.stringify(newMeta));
    writeFileSync(assetLocalPath, asset.content);
    this.assetFileMetaMap.set(
      this._getAssetFileMapKey(
        userId,
        asset.data.projectId.toString(),
        asset.id
      ),
      newMeta
    );
  }

  private _getProjectFileMapKey(userId: string, projectId: string) {
    return `${userId}/${projectId}`;
  }

  private _getAssetFileMapKey(
    userId: string,
    projectId: string,
    assetId: string
  ) {
    return `${userId}/${projectId}/${assetId}`;
  }

  readProjectFiles(userId: string, project: Project, excludeMeta = true) {
    function readDir(path: string, result: string[] = []) {
      const entries = readdirSync(path, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = join(path, entry.name);
        if (entry.isFile()) {
          if (excludeMeta && entry.name.endsWith(LocalFileManager.metaFileName))
            continue;
          result.push(entryPath);
        } else {
          readDir(entryPath, result);
        }
      }
      return result;
    }

    const projectPath = project.getLocalPath(this.localRootPath, userId);
    return readDir(projectPath);
  }

  exist(asset: Asset) {
    return existsSync(
      asset.getLocalPath(this.localRootPath, HostContext.userId)
    );
  }
}
