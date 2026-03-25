import {
  CompletionItem,
  DocumentUri,
  Position,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { AstNodeUtils } from './AstNodeUtils';
import { ENGINE_ENUMS } from '../builtin/identifiers';
import {
  createCompletionItemsForFields,
  createSignatureFromSymbol,
  createUserDescribe,
} from '../model/buildDocumentSemanticModel';
import { SymbolDescriptor } from '../model/SymbolDescriptor';

export function createSignatureFromDescriptor(symbol: SymbolDescriptor) {
  return createSignatureFromSymbol(symbol);
}

export function createUserDefineIdentifierDescribe(symbol: SymbolDescriptor) {
  return createUserDescribe(symbol);
}

export function createCompletionByDot(
  position: Position,
  docUri: DocumentUri
): CompletionItem[] | undefined {
  const context = ProviderContext.getInstance(docUri);
  const docContent = context.document!.getText();
  if (!AstNodeUtils.isCodePosition(position, docContent)) return;
  const word = AstNodeUtils.getWordAt(
    { ...position, character: position.character - 1 },
    docContent
  );

  if (word) {
    const engineEnum = ENGINE_ENUMS.find((item) => item.name === word);
    if (engineEnum) {
      return engineEnum.properties.map((prop) => ({
        label: prop.name,
        detail: prop.summary,
        documentation: prop.summary,
      }));
    }

    const semanticModel = context.semanticModel;
    if (!semanticModel) return;
    const offset = context.document!.offsetAt(position);
    const typeName = semanticModel?.getVisibleType(word, offset);
    if (typeName) {
      const fields = semanticModel.getFieldsForType(typeName);
      if (fields) {
        return createCompletionItemsForFields(fields);
      }
    }
  }

  return;
}
