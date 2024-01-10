import Command from './Command';
import Login from './Login';
import MoreProjects from './MoreProjects';
import OpenProject from './OpenProject';
import PullProjectAssets from './PullProjectAssets';
import PullProjectList from './PullProjectList';
import PushAssetChanges from './PushAssetChanges';
import RemoveAssetChange from './RemoveAssetChange';
import RestoreChanges from './RestoreChanges';
import StageAssetChange from './StageAssetChange';

export const Commands: Command[] = [
  new Login(),
  new OpenProject(),
  new PullProjectList(),
  new PullProjectAssets(),
  new RemoveAssetChange(),
  new StageAssetChange(),
  new PushAssetChanges(),
  new RestoreChanges(),
  new MoreProjects(),
];
