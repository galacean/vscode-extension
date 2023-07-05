import { NF_CLIENT_SHOW_CODE } from '@/constants';
import { commands } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

export function CommandShowGLSL(client: LanguageClient) {
  return commands.registerCommand('galacean.glsl.show', () => {
    client.sendNotification(NF_CLIENT_SHOW_CODE);
  });
}
