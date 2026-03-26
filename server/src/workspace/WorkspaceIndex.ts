import * as fs from 'fs';
import * as path from 'path';
import { URL, pathToFileURL } from 'url';
import {
  DocumentUri,
  TextDocuments,
  WorkspaceFolder,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  buildDocumentSemanticModel,
  DocumentSemanticModel,
} from '../model/buildDocumentSemanticModel';

interface IWorkspaceDocumentEntry {
  uri: DocumentUri;
  languageId: string;
  version: number;
  text: string;
  semanticModel?: DocumentSemanticModel;
  semanticModelVersion?: number;
}

interface IIgnoreMatcher {
  matches(filePath: string, relativePath: string, isDirectory: boolean): boolean;
}

class IgnoreMatcher implements IIgnoreMatcher {
  private readonly rawPatterns: string[];

  constructor(patterns: string[]) {
    this.rawPatterns = patterns
      .map((pattern) => pattern.trim())
      .filter((pattern) => !!pattern && !pattern.startsWith('#') && !pattern.startsWith('!'));
  }

  matches(filePath: string, relativePath: string, isDirectory: boolean): boolean {
    const normalizedRelativePath = relativePath.split(path.sep).join('/');
    const basename = path.basename(filePath);

    return this.rawPatterns.some((pattern) => {
      if (pattern === '.git' || pattern === '.temp' || pattern === 'out') {
        return (
          basename === pattern ||
          normalizedRelativePath === pattern ||
          normalizedRelativePath.startsWith(`${pattern}/`) ||
          normalizedRelativePath.includes(`/${pattern}/`)
        );
      }

      if (pattern === '**/node_modules') {
        return basename === 'node_modules' || normalizedRelativePath.includes('/node_modules');
      }

      if (pattern === '**/out/**') {
        return normalizedRelativePath === 'out' || normalizedRelativePath.includes('/out/');
      }

      if (pattern.startsWith('*.')) {
        return !isDirectory && basename.endsWith(pattern.slice(1));
      }

      return normalizedRelativePath === pattern;
    });
  }
}

export class WorkspaceIndex {
  private static documents: TextDocuments<TextDocument>;
  private static workspaceFolders: WorkspaceFolder[] = [];
  private static documentEntries = new Map<DocumentUri, IWorkspaceDocumentEntry>();
  private static indexedUris = new Set<DocumentUri>();
  private static readonly indexedExtensions = new Set(['.gs', '.gsl', '.glsl']);

  static init(documents: TextDocuments<TextDocument>) {
    this.documents = documents;
  }

  static setWorkspaceFolders(folders: WorkspaceFolder[]) {
    this.workspaceFolders = folders;
    this.scanWorkspaceFolders();
  }

  static getWorkspaceFolders() {
    return this.workspaceFolders;
  }

  static getIndexedUris() {
    return [...this.indexedUris];
  }

  static forEachIndexedUri(visitor: (uri: DocumentUri) => void) {
    this.indexedUris.forEach(visitor);
  }

  static getLanguageId(uri: DocumentUri): string | undefined {
    const opened = this.documents.get(uri);
    if (opened) return opened.languageId;
    return this.documentEntries.get(uri)?.languageId;
  }

  static upsertOpenDocument(document: TextDocument) {
    const existing = this.documentEntries.get(document.uri);
    this.documentEntries.set(document.uri, {
      uri: document.uri,
      languageId: document.languageId,
      version: document.version,
      text: document.getText(),
      semanticModel:
        existing?.semanticModelVersion === document.version
          ? existing.semanticModel
          : undefined,
      semanticModelVersion:
        existing?.semanticModelVersion === document.version
          ? existing.semanticModelVersion
          : undefined,
    });
  }

  static removeOpenDocument(uri: DocumentUri) {
    const filePath = this.getFilePathFromUri(uri);
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      this.documentEntries.set(uri, {
        uri,
        languageId: '',
        version: -1,
        text: fs.readFileSync(filePath, 'utf8'),
      });
      this.indexedUris.add(uri);
      return;
    }

    this.documentEntries.delete(uri);
    this.indexedUris.delete(uri);
  }

  static getDocumentText(uri: DocumentUri): string | undefined {
    const opened = this.documents.get(uri);
    if (opened) {
      this.upsertOpenDocument(opened);
      return opened.getText();
    }

    const cached = this.documentEntries.get(uri);
    if (cached) {
      return cached.text;
    }

    const filePath = this.getFilePathFromUri(uri);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return;
    }

    const text = fs.readFileSync(filePath, 'utf8');
    this.documentEntries.set(uri, {
      uri,
      languageId: '',
      version: -1,
      text,
    });
    return text;
  }

  static getSemanticModel(uri: DocumentUri): DocumentSemanticModel | undefined {
    const opened = this.documents.get(uri);
    if (opened) {
      this.upsertOpenDocument(opened);
    }

    const entry = this.documentEntries.get(uri);
    if (!entry) return;

    if (entry.semanticModelVersion !== entry.version || !entry.semanticModel) {
      entry.semanticModel = buildDocumentSemanticModel(entry.text);
      entry.semanticModelVersion = entry.version;
    }

    return entry.semanticModel;
  }

  static getFilePathFromUri(uri: string): string | undefined {
    if (!uri.startsWith('file://')) return;
    return decodeURIComponent(new URL(uri).pathname);
  }

  static positionAt(text: string, offset: number) {
    const lines = text.split('\n');
    let remaining = offset;

    for (let line = 0; line < lines.length; line++) {
      if (remaining <= lines[line].length) {
        return { line, character: remaining };
      }
      remaining -= lines[line].length + 1;
    }

    return {
      line: Math.max(lines.length - 1, 0),
      character: lines[lines.length - 1]?.length ?? 0,
    };
  }

  private static scanWorkspaceFolders() {
    this.indexedUris.clear();

    for (const folder of this.workspaceFolders) {
      const rootPath = this.getFilePathFromUri(folder.uri);
      if (!rootPath || !fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
        continue;
      }

      const ignoreMatcher = this.createIgnoreMatcher(rootPath);
      this.scanDirectory(rootPath, rootPath, ignoreMatcher);
    }
  }

  private static createIgnoreMatcher(rootPath: string): IIgnoreMatcher {
    const ignorePatterns = ['.git', '.temp', 'out', '**/out/**', '**/node_modules'];
    const gitIgnorePath = path.join(rootPath, '.gitignore');

    if (fs.existsSync(gitIgnorePath) && fs.statSync(gitIgnorePath).isFile()) {
      ignorePatterns.push(...fs.readFileSync(gitIgnorePath, 'utf8').split('\n'));
    }

    return new IgnoreMatcher(ignorePatterns);
  }

  private static scanDirectory(
    rootPath: string,
    directoryPath: string,
    ignoreMatcher: IIgnoreMatcher
  ) {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      const filePath = path.join(directoryPath, entry.name);
      const relativePath = path.relative(rootPath, filePath);
      if (ignoreMatcher.matches(filePath, relativePath, entry.isDirectory())) {
        continue;
      }

      if (entry.isDirectory()) {
        this.scanDirectory(rootPath, filePath, ignoreMatcher);
        continue;
      }

      if (!this.indexedExtensions.has(path.extname(entry.name))) {
        continue;
      }

      const uri = pathToFileURL(filePath).toString();
      this.indexedUris.add(uri);

      if (!this.documentEntries.has(uri)) {
        this.documentEntries.set(uri, {
          uri,
          languageId: '',
          version: -1,
          text: fs.readFileSync(filePath, 'utf8'),
        });
      }
    }
  }
}
