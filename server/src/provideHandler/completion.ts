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
import { provideIncludePathCompletion } from './includeCompletion';
import { providePreprocessorCompletion } from './preprocessorCompletion';
import { provideTagCompletion } from './tagCompletion';
import { provideEntryFunctionCompletion } from './entryCompletion';
import { provideUsePassCompletion } from './usePassSupport';

export function provideCompletion(
  docUri: DocumentUri,
  position: Position,
  context?: CompletionContext
): CompletionItem[] | undefined {
  const providerContext = ProviderContext.getInstance(docUri);
  const document = providerContext.document;
  if (!document) return;
  const docContent = document.getText();

  const includePathCompletion = provideIncludePathCompletion(docUri, position);
  if (includePathCompletion) {
    return includePathCompletion;
  }

  const usePassCompletion = provideUsePassCompletion(docUri, position);
  if (usePassCompletion) {
    return usePassCompletion;
  }

  const preprocessorCompletion = providePreprocessorCompletion(docUri, position);
  if (preprocessorCompletion) {
    return preprocessorCompletion;
  }

  const tagCompletion = provideTagCompletion(docUri, position);
  if (tagCompletion) {
    return tagCompletion;
  }

  const entryFunctionCompletion = provideEntryFunctionCompletion(docUri, position);
  if (entryFunctionCompletion) {
    return entryFunctionCompletion;
  }

  if (!AstNodeUtils.isCodePosition(position, docContent)) {
    return;
  }

  if (
    context?.triggerKind === CompletionTriggerKind.TriggerCharacter &&
    context.triggerCharacter === '.'
  ) {
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
