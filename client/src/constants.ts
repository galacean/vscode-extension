import { homedir } from 'os';
import { join } from 'path';

export const SHADER_LAG_ID = 'shaderlab';
export const ENV_PATH = join(homedir(), '.galacean');
// export const SERVER_HOST = 'oasisbe.antgroup.com';
// export const SERVER_PORT = 443;
export const SERVER_HOST = 'localhost';
export const SERVER_PORT = 8443;

export const OASIS_TOKEN_KEY = 'OasisToken';
export const ASSET_TYPE = ['Shader', 'script'];

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
