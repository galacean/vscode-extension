import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  InitializeParams,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  WorkspaceFolder,
  createConnection,
} from 'vscode-languageserver/node';
import { validateShader } from './provideHandler/validate';
import { provideCompletion } from './provideHandler/completion';
import { SHADER_LAG_ID } from './constants';
import { provideSignatureHelp } from './provideHandler/signatureHelp';
import { ProviderContext } from './provideHandler/ProviderContext';
import { provideHover } from './provideHandler/hover';
import { provideDefinition } from './provideHandler/definition';
import { provideDocumentSymbols } from './provideHandler/documentSymbol';
import { provideReferences } from './provideHandler/references';
import { provideWorkspaceSymbols } from './provideHandler/workspaceSymbol';
import {
  providePrepareRename,
  provideRename,
} from './provideHandler/rename';
import { WorkspaceIndex } from './workspace/WorkspaceIndex';
import { provideDocumentLinks } from './provideHandler/documentLink';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
ProviderContext.init(documents);
WorkspaceIndex.init(documents);

documents.listen(connection);
connection.listen();

connection.onInitialize((params: InitializeParams) => {
  const workspaceFolders: WorkspaceFolder[] = params.workspaceFolders
    ? params.workspaceFolders
    : params.rootUri
      ? [{ uri: params.rootUri, name: 'root' }]
      : [];
  WorkspaceIndex.setWorkspaceFolders(workspaceFolders);

  return {
    serverInfo: { name: 'Galacean ShaderLab Server' },
    capabilities: {
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', '/', '"', '#'],
      },
      textDocumentSync: TextDocumentSyncKind.Incremental,
      signatureHelpProvider: { triggerCharacters: ['('] },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
      documentLinkProvider: {
        resolveProvider: false,
      },
      workspaceSymbolProvider: true,
      renameProvider: {
        prepareProvider: true,
      },
      workspace: {
        workspaceFolders: {
          supported: true,
          changeNotifications: false,
        },
      },
    },
  };
});

documents.onDidOpen((change) => {
  WorkspaceIndex.upsertOpenDocument(change.document);
});

documents.onDidChangeContent((change) => {
  change.document.positionAt;
  const doc = change.document;
  WorkspaceIndex.upsertOpenDocument(doc);
  const diagnostics = validateShader(doc.getText(), doc.uri);

  connection.sendDiagnostics({ uri: doc.uri, diagnostics });
});

documents.onDidClose((change) => {
  WorkspaceIndex.removeOpenDocument(change.document.uri);
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics: [] });
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

connection.onDefinition((params) => {
  return provideDefinition(params.textDocument.uri, params.position);
});

connection.onDocumentSymbol((params) => {
  return provideDocumentSymbols(params.textDocument.uri);
});

connection.onDocumentLinks((params) => {
  return provideDocumentLinks(params.textDocument.uri);
});

connection.onReferences((params) => {
  return provideReferences(params);
});

connection.onWorkspaceSymbol((params) => {
  return provideWorkspaceSymbols(params.query);
});

connection.onPrepareRename((params) => {
  return providePrepareRename(params.textDocument.uri, params.position);
});

connection.onRenameRequest((params) => {
  return provideRename(params);
});
