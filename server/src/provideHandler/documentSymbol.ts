import {
  DocumentSymbol,
  DocumentUri,
  Range,
  SymbolKind,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { SymbolDescriptor } from '../model/SymbolDescriptor';

function toRange(docUri: DocumentUri, startOffset: number, endOffset: number): Range | undefined {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  return {
    start: document.positionAt(startOffset),
    end: document.positionAt(endOffset),
  };
}

function toDocumentSymbolKind(symbol: SymbolDescriptor): SymbolKind {
  switch (symbol.kind) {
    case 'function':
      return SymbolKind.Function;
    case 'struct':
      return SymbolKind.Struct;
    case 'renderState':
      return SymbolKind.Class;
    case 'variable':
    default:
      return SymbolKind.Variable;
  }
}

export function provideDocumentSymbols(
  docUri: DocumentUri
): DocumentSymbol[] | undefined {
  const context = ProviderContext.getInstance(docUri);
  const semanticModel = context.semanticModel;
  if (!semanticModel) return;

  return semanticModel.symbols
    .map((symbol) => {
      const range = toRange(docUri, symbol.startOffset, symbol.endOffset);
      const selectionRange = toRange(
        docUri,
        symbol.selectionStartOffset,
        symbol.selectionEndOffset
      );
      if (!range || !selectionRange) return;

      return DocumentSymbol.create(
        symbol.name,
        symbol.kind === 'function' ? symbol.returnType : undefined,
        toDocumentSymbolKind(symbol),
        range,
        selectionRange
      );
    })
    .filter(Boolean) as DocumentSymbol[];
}
