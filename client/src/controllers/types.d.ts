type IProjectMeta = IProject;

type IAssetMeta = IAsset;

type Dependencies = Record<string, string>;
interface IPkgInfo {
  dependencies?: Dependencies;
  other: Record<string, any>;
}
