import {
  Position,
  SignatureHelp,
  DocumentUri,
  SignatureHelpContext,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { Builtin } from '../builtin';
import { createSignatureFromAstNode } from './utils';

function isTriggeredAfterCompletionResolve(
  triggerPosition: Position,
  docUri: DocumentUri
) {
  const context = ProviderContext.getInstance(docUri);
  if (!context.lastResolvedCompletion) return false;
  const lastCompletion = context.lastResolvedCompletion.item;
  const docContent = context.document!.getText();
  const line = docContent
    .split('\n')
    [triggerPosition.line].slice(0, triggerPosition.character - 1);
  return line.endsWith(lastCompletion.label);
}

export function provideSignatureHelp(
  docUri: DocumentUri,
  position: Position,
  triggerContext?: SignatureHelpContext
): SignatureHelp | undefined {
  if (!isTriggeredAfterCompletionResolve(position, docUri)) return;

  const context = ProviderContext.getInstance(docUri);
  const completionData = context.lastResolvedCompletion.item.data;
  if (completionData._astType) {
    return createSignatureFromAstNode(completionData);
  } else {
    return Builtin.getFunctionSignature(completionData);
  }
}
