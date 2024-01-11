import Command from './Command';
import Login from './Login';
import MoreProjects from './MoreProjects';
import NpmInstall from './NpmInstall';
import OpenProject from './OpenProject';
import PullProjectAssets from './PullProjectAssets';
import PullProjectList from './PullProjectList';

export const Commands: Command[] = [
  new Login(),
  new OpenProject(),
  new PullProjectList(),
  new PullProjectAssets(),
  new MoreProjects(),
  new NpmInstall(),
];
