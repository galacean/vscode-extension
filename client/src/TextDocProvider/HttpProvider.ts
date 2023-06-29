import axios from 'axios';
import {
  CancellationToken,
  Event,
  EventEmitter,
  ProviderResult,
  TextDocumentContentProvider,
  Uri,
} from 'vscode';

class HttpTextDocProvider implements TextDocumentContentProvider {
  contentChangeEventEmitter = new EventEmitter<Uri>();
  onDidChange: Event<Uri> = this.contentChangeEventEmitter.event;

  provideTextDocumentContent(
    uri: Uri,
    token: CancellationToken
  ): ProviderResult<string> {
    const url = uri.toString(true);
    return axios.get(url.replace(/^asset:/, 'http:')).then((res) => {
      return res.data;
    });
  }
}

export { HttpTextDocProvider };
