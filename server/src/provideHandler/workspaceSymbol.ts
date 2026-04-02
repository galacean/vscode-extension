import {
  Location,
  SymbolKind,
  WorkspaceSymbol,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { SymbolDescriptor } from '../model/SymbolDescriptor';
import { WorkspaceIndex } from '../workspace/WorkspaceIndex';

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
  const result: WorkspaceSymbol[] = [];

  WorkspaceIndex.forEachIndexedUri((uri) => {
    const semanticModel = ProviderContext.getInstance(uri).semanticModel;
    if (!semanticModel) return;

    semanticModel.symbols.forEach((symbol) => {
      if (lowered && !symbol.name.toLowerCase().includes(lowered)) return;

      const text = WorkspaceIndex.getDocumentText(uri);
      if (!text) return;

      result.push({
        name: symbol.name,
        kind: toWorkspaceSymbolKind(symbol),
        location: Location.create(uri, {
          start: WorkspaceIndex.positionAt(text, symbol.selectionStartOffset),
          end: WorkspaceIndex.positionAt(text, symbol.selectionEndOffset),
        }),
      });
    });
  });

  return result;
}
