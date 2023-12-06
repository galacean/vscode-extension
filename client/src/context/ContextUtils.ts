import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { ENV_PATH } from '../constants';
import { window } from 'vscode';
import { dirname } from 'path';

if (!existsSync(dirname(ENV_PATH))) {
  mkdirSync(dirname(ENV_PATH), { recursive: true });
}

if (!existsSync(ENV_PATH)) {
  writeFileSync(ENV_PATH, '{}');
}

export default class ContextUtils {
  static loadEnv(): IHostEnv {
    const env = readFileSync(ENV_PATH).toString();
    try {
      const result = JSON.parse(env) as IHostEnv;
      if (!result.cookies) {
        result.cookies = {};
      }
      return result;
    } catch (e) {
      window.showErrorMessage(
        'Failed to load galacean environment configuration file'
      );
      throw e;
    }
  }

  static updateEnv(content: IHostEnv) {
    const obj = JSON.stringify(content);
    writeFileSync(ENV_PATH, obj);
  }
}
