import Command from './Command';

export default class PushProjectList extends Command {
  name: string = 'galacean.push.project_list';

  async callback(projectId: string) {
    console.log(projectId);
  }
}
