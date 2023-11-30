import { basename } from 'path';
import {
  CancellationToken,
  ProviderResult,
  TextDocumentContentProvider,
  Uri,
} from 'vscode';
import HostContext from '../context/HostContext';

/**
 * galacean://${asset.id}
 */
export class AssetOriginContentProvider implements TextDocumentContentProvider {
  provideTextDocumentContent(
    uri: Uri,
    token: CancellationToken
  ): ProviderResult<string> {
    const assetId = basename(uri.path);
    const asset = HostContext.userContext.openedProject.findAssetById(assetId);
    if (!asset) {
      console.warn(`not found asset ${assetId}`);
      return '';
    }
    return asset.content;
  }
}
