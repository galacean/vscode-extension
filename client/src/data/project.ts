import { EventEmitter, Uri } from 'vscode';

export const ProjectListDataChangeEvent = new EventEmitter<void | ITreeViewItem<
  any,
  Uri
>>();
