import * as path from 'path';
import { ExtensionContext, languages } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { SHADERLAB_ID } from './constants';
import { FormatterProvider } from './providers/Formatter';
import { EditorPropertiesCompletionProvider } from './providers/EditorPropertiesCompletionProvider';
import SimpleCompletionItemProvider from './providers/CompletionProvider';

let _singleton: Client;
const selector = { language: SHADERLAB_ID };

export default class Client {
  _instance!: LanguageClient;

  static getClient() {
    if (!_singleton) throw 'not initialized';
    return _singleton;
  }

  static create(context: ExtensionContext) {
    _singleton = new Client(context);
    return _singleton;
  }

  private constructor(context: ExtensionContext) {
    this.initClient(context);
    this.registerProviders(context);
  }

  private initClient(context: ExtensionContext) {
    const serverModule = context.asAbsolutePath(
      path.join('server', 'out', 'main.js')
    );

    const serverOptions: ServerOptions = {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
      },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ scheme: 'file', language: SHADERLAB_ID }],
    };

    const client = new LanguageClient(
      'galacean-shaderlab',
      'Galacean ShaderLab',
      serverOptions,
      clientOptions
    );

    client.start();
    this._instance = client;
  }

  deactivate(): Thenable<void> | undefined {
    return this._instance.stop();
  }

  private registerProviders(context: ExtensionContext) {
    context.subscriptions.push(
      languages.registerDocumentRangeFormattingEditProvider(
        selector,
        new FormatterProvider()
      )
    );

    context.subscriptions.push(
      languages.registerCompletionItemProvider(
        selector,
        new EditorPropertiesCompletionProvider()
      )
    );

    context.subscriptions.push(
      languages.registerCompletionItemProvider(
        selector,
        new SimpleCompletionItemProvider()
      )
    );
  }
}
