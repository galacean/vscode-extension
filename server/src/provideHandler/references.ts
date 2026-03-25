import {
  DocumentUri,
  Location,
  Position,
  Range,
  ReferenceParams,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { AstNodeUtils } from './AstNodeUtils';
import { SHADER_LAG_ID } from '../constants';

export function getLookupWord(docUri: DocumentUri, position: Position) {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  const lookupPosition =
    position.character > 0
      ? { ...position, character: position.character - 1 }
      : position;
  return AstNodeUtils.getWordAt(lookupPosition, document.getText());
}

export function findSymbolLocations(
  docUri: DocumentUri,
  symbolName: string
): Location[] {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return [];

  const content = document.getText();
  const matcher = new RegExp(`\\b${symbolName}\\b`, 'g');
  const locations: Location[] = [];

  for (const match of content.matchAll(matcher)) {
    const startOffset = match.index ?? 0;
    const start = document.positionAt(startOffset);
    if (AstNodeUtils.getLexicalStateAt(start, content) !== 'code') continue;

    const end = document.positionAt(startOffset + symbolName.length);
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

  const documents = ProviderContext.getDocuments();
  const locations: Location[] = [];

  documents.all().forEach((document) => {
    if (document.languageId !== SHADER_LAG_ID) return;
    locations.push(...findSymbolLocations(document.uri, word));
  });

  return {
    word,
    locations,
  };
}

export function provideReferences(params: ReferenceParams) {
  const result = collectReferences(params.textDocument.uri, params.position);
  if (!result) return;

  const { locations } = result;
  const targetContext = ProviderContext.getInstance(params.textDocument.uri);
  const semanticModel = targetContext.semanticModel;
  if (!semanticModel) return;

  return locations;
}
