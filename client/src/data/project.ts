import { EventEmitter, Uri } from 'vscode';
import { getProjectList } from '../request/project';

let _projectList: IProjectListItem[] | undefined = undefined;

export async function getProjectListData(refresh = false) {
  if (!_projectList || refresh) {
    const res = await getProjectList();
    _projectList = res.data.data.list;
  }
  return _projectList;
}

export function updateProjectListData(data: IProjectListItem[], append = true) {
  if (append) {
    _projectList = (_projectList ?? []).concat(data);
  } else {
    _projectList = data;
  }
  return _projectList;
}

export const ProjectListDataChangeEvent = new EventEmitter<void | ITreeViewItem<
  any,
  Uri
>>();
