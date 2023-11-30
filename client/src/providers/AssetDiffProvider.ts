import {
  CancellationToken,
  ProviderResult,
  QuickDiffProvider,
  Uri,
} from 'vscode';
import { ASSET_EXT, ASSET_TYPE, GALACEAN_ASSET_SCHEMA } from '../constants';
import { basename, extname } from 'path';
import HostContext from '../context/HostContext';

export default class AssetDiffProvider implements QuickDiffProvider {
  provideOriginalResource(
    uri: Uri,
    token: CancellationToken
  ): ProviderResult<Uri> {
    console.log('diff: ', uri.toString());
    // return uri;
    const extension = extname(uri.path);
    if (!ASSET_EXT.includes(extension)) return uri;

    const assetId = this.getAssetId(uri);
    console.log(
      Uri.from({ scheme: GALACEAN_ASSET_SCHEMA, path: assetId }).toString()
    );
    return Uri.from({ scheme: GALACEAN_ASSET_SCHEMA, path: assetId });
  }

  private getAssetId(uri: Uri): string {
    const openedProject = HostContext.userContext.openedProject;
    if (!openedProject || !openedProject.assetsInitialized) {
      throw 'no project opened';
    }

    const name = basename(uri.path);
    const asset = openedProject.findAssetByName(name);
    if (!asset) throw `no asset find ${name} ${uri}`;
    return asset.data.id.toString();
  }
}
