import { CompletionItem, CompletionItemKind, DocumentUri, Position } from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';

const PREPROCESSOR_DIRECTIVES = [
  '#include',
  '#define',
  '#if',
  '#ifdef',
  '#ifndef',
  '#elif',
  '#else',
  '#endif',
];

export function providePreprocessorCompletion(
  docUri: DocumentUri,
  position: Position
): CompletionItem[] | undefined {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  const linePrefix = document
    .getText()
    .split('\n')
    [position.line].slice(0, position.character);
  const match = linePrefix.match(/^\s*#([\w]*)$/);
  if (!match) return;

  const typedDirective = `#${match[1]}`.toLowerCase();
  return PREPROCESSOR_DIRECTIVES.filter((directive) =>
    directive.toLowerCase().startsWith(typedDirective)
  ).map((directive) => ({
    label: directive,
    kind: CompletionItemKind.Keyword,
    insertText: directive,
  }));
}
