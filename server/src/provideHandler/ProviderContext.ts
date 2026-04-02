import {
  DocumentUri,
  TextDocuments,
  CompletionItem,
  Position,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  DocumentSemanticModel,
} from '../model/buildDocumentSemanticModel';
import { WorkspaceIndex } from '../workspace/WorkspaceIndex';

interface CompletionInfo {
  position: Position;
  item: CompletionItem;
}

export class CompletionData<T = any> {
  readonly docUri: DocumentUri;
  readonly originData?: T;
  readonly position: Position;

  constructor(uri: DocumentUri, position: Position, item?: T) {
    this.docUri = uri;
    this.originData = item;
    this.position = position;
  }
}

export class ProviderContext {
  static docMap: Map<DocumentUri, ProviderContext> = new Map();
  static getInstance(docUri: DocumentUri) {
    let instance = this.docMap.get(docUri);
    if (!instance) {
      instance = new ProviderContext(docUri);
      this.docMap.set(docUri, instance);
    }
    return instance;
  }
  private static documents: TextDocuments<TextDocument>;

  static init(documents: TextDocuments<TextDocument>) {
    this.documents = documents;
  }

  static getDocuments() {
    return this.documents;
  }

  readonly uri: DocumentUri;

  private _lastResolvedCompletion?: CompletionInfo;
  private _semanticModel?: DocumentSemanticModel;
  private _semanticModelVersion?: number;

  get lastResolvedCompletion() {
    // @ts-ignore
    return this._lastResolvedCompletion;
  }

  set lastResolvedCompletion(item: CompletionInfo) {
    this._lastResolvedCompletion = item;
  }

  get document() {
    return ProviderContext.documents.get(this.uri);
  }

  get semanticModel() {
    const document = this.document;
    if (!document) {
      return WorkspaceIndex.getSemanticModel(this.uri);
    }

    if (this._semanticModelVersion !== document.version) {
      this._semanticModel = WorkspaceIndex.getSemanticModel(this.uri);
      this._semanticModelVersion = document.version;
    }

    return this._semanticModel;
  }

  static curCompletionData: CompletionData;

  private constructor(docUri: DocumentUri) {
    this.uri = docUri;
  }
}
