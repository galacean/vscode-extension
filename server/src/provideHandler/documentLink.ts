import { DocumentLink, DocumentUri } from 'vscode-languageserver';
import { provideIncludeDocumentLinks } from './includeCompletion';
import { provideUsePassDocumentLinks } from './usePassSupport';

export function provideDocumentLinks(docUri: DocumentUri): DocumentLink[] {
  return [
    ...provideIncludeDocumentLinks(docUri),
    ...provideUsePassDocumentLinks(docUri),
  ];
}
