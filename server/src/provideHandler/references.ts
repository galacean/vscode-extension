import {
  DocumentUri,
  Location,
  Position,
  Range,
  ReferenceParams,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { AstNodeUtils } from './AstNodeUtils';
import { WorkspaceIndex } from '../workspace/WorkspaceIndex';

export function getLookupWord(docUri: DocumentUri, position: Position) {
  const content = WorkspaceIndex.getDocumentText(docUri);
  if (!content) return;

  const lookupPosition =
    position.character > 0
      ? { ...position, character: position.character - 1 }
      : position;
  return AstNodeUtils.getWordAt(lookupPosition, content);
}

export function findSymbolLocations(
  docUri: DocumentUri,
  symbolName: string
): Location[] {
  const content = WorkspaceIndex.getDocumentText(docUri);
  if (!content) return [];
  const matcher = new RegExp(`\\b${symbolName}\\b`, 'g');
  const locations: Location[] = [];

  for (const match of content.matchAll(matcher)) {
    const startOffset = match.index ?? 0;
    const start = WorkspaceIndex.positionAt(content, startOffset);
    if (AstNodeUtils.getLexicalStateAt(start, content) !== 'code') continue;

    const end = WorkspaceIndex.positionAt(content, startOffset + symbolName.length);
    locations.push(Location.create(docUri, Range.create(start, end)));
  }

  return locations;
}

export function collectReferences(docUri: DocumentUri, position: Position) {
  const word = getLookupWord(docUri, position);
  if (!word) return;

  const targetContext = ProviderContext.getInstance(docUri);
  const semanticModel = targetContext.semanticModel;
  if (!semanticModel?.symbolsByName.has(word)) return;

  const locations: Location[] = [];

  WorkspaceIndex.forEachIndexedUri((uri) => {
    locations.push(...findSymbolLocations(uri, word));
  });

  return {
    word,
    locations,
  };
}

export function provideReferences(params: ReferenceParams) {
  const result = collectReferences(params.textDocument.uri, params.position);
  if (!result) return;

  return result.locations;
}
