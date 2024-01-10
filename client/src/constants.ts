import { homedir } from 'os';
import { join, dirname } from 'path';

// export const SERVER_HOST = 'oasisbe.antgroup.com';
// export const SERVER_PORT = 443;

export const SERVER_HOST = 'oasisbe.test.alipay.net';
export const SERVER_PORT = 443;

// export const SERVER_HOST = 'localhost';
// export const SERVER_PORT = 8443;

export const SHADER_LAG_ID = 'shaderlab';
export const ENV_PATH = join(homedir(), '.galacean', SERVER_HOST);

export const OASIS_TOKEN_KEY = 'OasisToken';
export const ASSET_TYPE = ['Shader', 'script'] as const;
export const ASSET_EXT = ['.shader', '.ts'];

export enum EViewID {
  ProjectList = 'project-list',
}

export const BUILTIN_SHADERS = [
  'pbr',
  'pbr-specular',
  'blinn-phon',
  'unlit',
  'bake-pbr',
  'skybox',
  'SkyProcedural',
];

export const CLIENT_ROOT_PATH = dirname(__dirname);
export const RES_DIR_PATH = join(CLIENT_ROOT_PATH, 'res');
