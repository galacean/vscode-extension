import HostContext from '../context/HostContext';
import Project from '../models/Project';
import Command from './Command';

export default class PushProjectAssets extends Command {
  name: string = 'galacean.push.project';

  callback(project: Project) {
    HostContext.userContext.setPushProject(project);
  }
}
