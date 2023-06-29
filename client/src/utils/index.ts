import axios, { AxiosRequestConfig } from 'axios';
import {
  StatusBarAlignment,
  window,
  StatusBarItem,
  ExtensionContext,
} from 'vscode';

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
