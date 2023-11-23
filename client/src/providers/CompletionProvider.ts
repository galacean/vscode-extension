import {
  CancellationToken,
  CompletionContext,
  CompletionItem,
  CompletionItemProvider,
  CompletionList,
  Position,
  ProviderResult,
  TextDocument,
} from 'vscode';
import { BUILTIN_SHADERS } from '../constants';
import { CompletionItemKind } from 'vscode-languageclient';

export default class SimpleCompletionItemProvider
  implements CompletionItemProvider
{
  private builtinShaderRegex = /^\s*\/\/\s*@builtin/;

  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext
  ): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
    const line = document.lineAt(position.line).text;
    if (this.builtinShaderRegex.test(line)) {
      return BUILTIN_SHADERS.map((item) => ({
        label: item,
        kind: CompletionItemKind.Module,
        documentation: `Engine builtin shader ${item}`,
      }));
    }
  }
}
