import {
  createConnection,
  InitializeParams,
  ProposedFeatures,
  TextDocuments,
  InitializeResult,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { cachedShaderInfo, makeDocumentValidationHandler } from './utils';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  console.log('connection request initialize: ', params);
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
    },
  };
  return result;
});

documents.listen(connection);

connection.onNotification('client/show.glsl', () => {
  if (!cachedShaderInfo) {
    connection.window.showWarningMessage('No parsed shader');
  } else {
    connection.sendNotification('server/show.glsl', {
      subShaders: cachedShaderInfo.subShaders,
    });
  }
});

connection.listen();

const docValidationHandler = makeDocumentValidationHandler(connection);

documents.onDidOpen(docValidationHandler);
documents.onDidSave(docValidationHandler);
