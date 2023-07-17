import { homedir } from 'os';
import { join } from 'path';
import { Uri, workspace } from 'vscode';
import * as fs from 'fs';

export const PROJ_ROOT = join(__dirname, '../../');
export const TEMPLATE_DIR_PATH = join(PROJ_ROOT, 'templates');

export const OASIS_TOKEN_COOKIE_NAME = 'OasisToken';

export enum EProjectAssetType {
  file = 0,
  directory = 1,
}

export const FSSchema = 'galacean';

// Notification keys
export const NF_CLIENT_SHOW_CODE = 'client/show.glsl';

export const NF_SERVER_SHOW_CODE = 'server/show.glsl';

// Builtin Dependencies
export const BUILTIN_PKGS = ['@galacean/engine', 'react', 'react-dom'];

export const URI_QUERY_CREATE_LOCALLY = 'createLocally';

export const URI_QUERY_EDIT_LOCALLY = 'editLocally';
