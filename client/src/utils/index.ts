import axios, { AxiosRequestConfig } from 'axios';
import {
  StatusBarAlignment,
  window,
  StatusBarItem,
  ExtensionContext,
  Uri,
} from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { PROJ_ROOT } from '@/constants';

let _statusBar: StatusBarItem | undefined = undefined;

export function showUserInfoStatusBar(
  context: ExtensionContext,
  text?: string
) {
  if (!_statusBar) {
    _statusBar = window.createStatusBarItem(StatusBarAlignment.Left, 10);
    context.subscriptions.push(_statusBar);
  }
  if (text) {
    _statusBar.text = text;
    _statusBar.show();
  } else {
    _statusBar.hide();
  }
}

export function fetchContentByUrl(url: string, opts?: AxiosRequestConfig) {
  return axios.get(url, opts).then((res) => res.data);
}

export function hashMD5(input: string) {
  return crypto.createHash('md5').update(input).digest('hex');
}

export function getTemplate(type?: 'script' | 'shader') {
  const filename = type === 'script' ? 'script.ts' : 'water.shader';
  const templatePath = path.join(PROJ_ROOT, `client/templates/${filename}`);
  return fs.readFileSync(templatePath);
}

export function getParentUri(uri: Uri): Uri {
  return uri.with({ path: path.dirname(uri.path) });
}
