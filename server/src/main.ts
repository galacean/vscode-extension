import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from 'vscode-languageserver/node';
import { validateShader } from './provideHandler/validate';
import { provideCompletion } from './provideHandler/completion';
import { SHADER_LAG_ID } from './constants';
import { provideSignatureHelp } from './provideHandler/signatureHelp';
import { ProviderContext } from './provideHandler/ProviderContext';
import { provideHover } from './provideHandler/hover';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
ProviderContext.init(documents);

documents.listen(connection);
connection.listen();

connection.onInitialize(() => {
  return {
    serverInfo: { name: 'Galacean LSP Server' },
    capabilities: {
      completionProvider: { resolveProvider: true, triggerCharacters: ['.'] },
      textDocumentSync: TextDocumentSyncKind.Incremental,
      signatureHelpProvider: { triggerCharacters: ['('] },
      hoverProvider: true,
    },
  };
});

documents.onDidChangeContent((change) => {
  change.document.positionAt;
  const doc = change.document;
  const diagnostics = validateShader(doc.getText());

  connection.sendDiagnostics({ uri: doc.uri, diagnostics });
});

connection.onCompletion((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc || doc.languageId !== SHADER_LAG_ID) return;

  return provideCompletion(
    params.textDocument.uri,
    params.position,
    params.context!
  );
});

connection.onCompletionResolve((completion) => {
  // connection.window.showInformationMessage(`document resolve`);

  if (ProviderContext.curCompletionData) {
    const context = ProviderContext.getInstance(
      ProviderContext.curCompletionData.docUri
    );
    context.lastResolvedCompletion = {
      item: completion,
      position: completion.data?.position,
    };
  }
  completion.detail = completion.detail;
  completion.documentation = completion.documentation;

  return completion;
});

connection.onSignatureHelp((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc || doc.languageId !== SHADER_LAG_ID) return;

  return provideSignatureHelp(
    params.textDocument.uri,
    params.position,
    params.context
  );
});

connection.onHover((params) => {
  return provideHover(params.textDocument.uri, params.position);
});
