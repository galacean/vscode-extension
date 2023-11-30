import HostContext from '../context/HostContext';
import Command from './Command';

export default class RefreshDirtyAssets extends Command {
  name: string = 'galacean.refresh.dirtyAssets';

  callback() {
    const pushProject = HostContext.userContext.pushProject;
    if (!pushProject) return;

    HostContext.userContext.setPushProject(pushProject);
  }
}
