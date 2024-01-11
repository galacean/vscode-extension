import {
  ProviderResult,
  Uri,
  UriHandler,
  commands,
  window,
  workspace,
} from 'vscode';
import HostContext from '../context/HostContext';
import { fetchAssetDetail, fetchProjectDetail } from '../utils';
import Project from '../models/Project';
import Asset from '../models/Asset';
import LocalFileManager from '../models/LocalFileManager';
import OpenProject from '../commands/OpenProject';

export default class URIHandler implements UriHandler {
  handleUri(uri: Uri): ProviderResult<void> {
    const queryParams = new URLSearchParams(uri.query);
    const projectId = queryParams.get('pid');
    const assetId = queryParams.get('aid');

    let project = HostContext.userContext.getProjectById(projectId);
    if (!project) {
      const userContext = HostContext.userContext;
      fetchProjectDetail(projectId).then(async (res) => {
        project = new Project(res);
        const projectList = userContext.projectList;
        projectList.push(project);
        projectList.sort((a, b) =>
          a.data.gmtCreate > b.data.gmtCreate ? -1 : 1
        );
        userContext.projectList = projectList;

        this.openProject(project, assetId);
      });
    } else {
      this.openProject(project, assetId);
    }

    window.showInformationMessage(`open vscode by uri: ${uri.toString()}`);
  }

  async openProject(project: Project, assetId: string) {
    await commands.executeCommand(OpenProject.command, project.data.id);
    let asset = project.findAssetById(assetId);
    if (!asset) {
      const assetData = await fetchAssetDetail(assetId);
      asset = new Asset(assetData, project);

      asset.initLocalPath();
      await LocalFileManager.updateAsset(asset);
    }
    const doc = await workspace.openTextDocument(asset.localUri);
    window.showTextDocument(doc);
  }
}
