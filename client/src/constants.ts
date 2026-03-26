import { dirname, join } from 'path';

export const SHADERLAB_ID = 'GalaceanShaderlab';

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
