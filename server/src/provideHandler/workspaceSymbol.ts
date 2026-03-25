import {
  Location,
  SymbolKind,
  WorkspaceSymbol,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { SHADER_LAG_ID } from '../constants';
import { SymbolDescriptor } from '../model/SymbolDescriptor';

function toWorkspaceSymbolKind(symbol: SymbolDescriptor): SymbolKind {
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

export function provideWorkspaceSymbols(query: string) {
  const lowered = query.trim().toLowerCase();
  const documents = ProviderContext.getDocuments();
  const result: WorkspaceSymbol[] = [];

  documents.all().forEach((document) => {
    if (document.languageId !== SHADER_LAG_ID) return;

    const semanticModel = ProviderContext.getInstance(document.uri).semanticModel;
    if (!semanticModel) return;

    semanticModel.symbols.forEach((symbol) => {
      if (lowered && !symbol.name.toLowerCase().includes(lowered)) return;

      result.push({
        name: symbol.name,
        kind: toWorkspaceSymbolKind(symbol),
        location: Location.create(document.uri, {
          start: document.positionAt(symbol.selectionStartOffset),
          end: document.positionAt(symbol.selectionEndOffset),
        }),
      });
    });
  });

  return result;
}
