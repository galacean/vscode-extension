import axios, { AxiosRequestConfig } from 'axios';
import {
  StatusBarAlignment,
  window,
  StatusBarItem,
  ExtensionContext,
  Uri,
  workspace,
} from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { TEMPLATE_DIR_PATH } from '@/constants';
import { getProjectFSProvider } from '@/FSDocProvider';

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
  return axios
    .get(url, opts)
    .then((res) => res.data)
    .catch(() => {
      window.showErrorMessage(`failed to fetch content: ${url}`);
    });
}

export function hashMD5(input: string) {
  return crypto.createHash('md5').update(input).digest('hex');
}

export function getTemplate(type?: 'script' | 'shader') {
  const filename = type === 'script' ? 'script.ts' : 'water.shader';
  const templatePath = path.join(TEMPLATE_DIR_PATH, filename);
  return fs.readFileSync(templatePath);
}

export function getParentUri(uri: Uri): Uri {
  return uri.with({ path: path.dirname(uri.path) });
}

export function isScript(uri: Uri): boolean {
  return path.extname(uri.path) === '.ts';
}

export async function openTexDoc(uri: Uri) {
  const doc = await workspace.openTextDocument(uri);
  return window.showTextDocument(doc);
}

export function fsUri2MemUriInfo(uri: Uri) {
  const regex = /.+\/galacean\/([^\/]+)\/src\/(.+)/;
  const result = uri.path.match(regex);
  const projectId = result[1];
  const path = result[2];
  const fsProvider = getProjectFSProvider();
  const memUri = Uri.joinPath(fsProvider.rootUri, projectId, path);
  return {
    memUri,
    projectId,
    path,
  };
}
