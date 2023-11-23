import { join } from 'path';

export default class Project {
  readonly data: IProject;

  constructor(data: IProject) {
    this.data = data;
  }

  getLocalPath(localRootPath: string, userId: string) {
    return join(localRootPath, userId, this.data.id.toString());
  }
}
