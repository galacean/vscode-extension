import {
  CompletionContext,
  CompletionItem,
  CompletionTriggerKind,
  DocumentUri,
  Position,
} from 'vscode-languageserver';
import { Builtin } from '../builtin';
import { CompletionData, ProviderContext } from './ProviderContext';
import { createCompletionByDot } from './utils';
import { createCompletionItemFromSymbol } from '../model/buildDocumentSemanticModel';
import { AstNodeUtils } from './AstNodeUtils';

export function provideCompletion(
  docUri: DocumentUri,
  position: Position,
  context?: CompletionContext
): CompletionItem[] | undefined {
  const providerContext = ProviderContext.getInstance(docUri);
  const document = providerContext.document;
  if (!document) return;
  const docContent = document.getText();

  if (!AstNodeUtils.isCodePosition(position, docContent)) {
    return;
  }

  if (context?.triggerKind === CompletionTriggerKind.TriggerCharacter) {
    return createCompletionByDot(position, docUri);
  } else {
    const builtin = Builtin.getInstance();
    ProviderContext.curCompletionData = new CompletionData(docUri, position);
    const semanticModel = providerContext.semanticModel;
    const userSymbols: CompletionItem[] =
      semanticModel?.symbols.map(createCompletionItemFromSymbol) ?? [];
    const completionItems = [
      ...userSymbols,
      ...builtin.functionCompletions,
      ...builtin.engineEnums,
      ...builtin.glslVars,
    ];

    const deduped = new Map<string, CompletionItem>();
    for (const item of completionItems) {
      if (!deduped.has(item.label.toString())) {
        deduped.set(item.label.toString(), item);
      }
    }

    const prefix = AstNodeUtils.getCompletionPrefix(position, docContent).toLowerCase();
    if (!prefix) {
      return [...deduped.values()];
    }

    return [...deduped.values()].filter((item) =>
      item.label.toString().toLowerCase().startsWith(prefix)
    );
  }
}
