import { ExtensionContext, Disposable } from 'vscode';

export default abstract class Command {
  abstract name: string;
  abstract callback(context: ExtensionContext): any;
}
