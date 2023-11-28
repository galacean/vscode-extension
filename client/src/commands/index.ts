import Command from './Command';
import Login from './Login';
import OpenProject from './OpenProject';
import PullProjectAssets from './PullProjectAssets';
import PullProjectList from './PullProjectList';
import PushProjectAssets from './PushProjectAssets';

export const Commands: Command[] = [
  new Login(),
  new OpenProject(),
  new PullProjectList(),
  new PullProjectAssets(),
  new PushProjectAssets(),
];
