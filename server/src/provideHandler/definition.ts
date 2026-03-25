import { Definition, DocumentUri, Location, Position, Range } from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { AstNodeUtils } from './AstNodeUtils';
import { SymbolDescriptor } from '../model/SymbolDescriptor';
import { provideIncludeDefinition } from './includeCompletion';
import { provideUsePassDefinition } from './usePassSupport';

function toRange(docUri: DocumentUri, symbol: SymbolDescriptor): Range | undefined {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  return {
    start: document.positionAt(symbol.selectionStartOffset),
    end: document.positionAt(symbol.selectionEndOffset),
  };
}

export function provideDefinition(
  docUri: DocumentUri,
  position: Position
): Definition | undefined {
  const usePassDefinition = provideUsePassDefinition(docUri, position);
  if (usePassDefinition) {
    return usePassDefinition;
  }

  const includeDefinition = provideIncludeDefinition(docUri, position);
  if (includeDefinition) {
    return includeDefinition;
  }

  const context = ProviderContext.getInstance(docUri);
  const document = context.document;
  const semanticModel = context.semanticModel;
  if (!document || !semanticModel) return;

  if (!AstNodeUtils.isCodePosition(position, document.getText())) return;

  const lookupPosition =
    position.character > 0
      ? { ...position, character: position.character - 1 }
      : position;
  const word = AstNodeUtils.getWordAt(lookupPosition, document.getText());
  if (!word) return;

  const symbol = semanticModel.symbolsByName.get(word);
  if (!symbol) return;

  const range = toRange(docUri, symbol);
  if (!range) return;

  return Location.create(docUri, range);
}
