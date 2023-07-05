import { homedir } from 'os';
import { join } from 'path';
import { Uri, workspace } from 'vscode';
import * as fs from 'fs';

const _filePath = join(homedir(), '.galacean-vse');
export const COOKIE_FILE = Uri.file(_filePath);

if (!fs.existsSync(_filePath)) {
  workspace.fs.writeFile(COOKIE_FILE, Buffer.from('{}'));
}

export const PROJ_ROOT = join(__dirname, '../../');

export const OASIS_TOKEN_COOKIE_NAME = 'OasisToken';

export enum EProjectAssetType {
  file = 0,
  directory = 1,
}

export const FSSchema = 'galacean';

// Notification keys
export const NF_CLIENT_SHOW_CODE = 'client/show.glsl';

export const NF_SERVER_SHOW_CODE = 'server/show.glsl';
