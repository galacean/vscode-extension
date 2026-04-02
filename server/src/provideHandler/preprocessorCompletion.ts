import {
  CompletionList,
  CompletionItem,
  CompletionItemKind,
  DocumentUri,
  Position,
  Range,
  TextEdit,
} from 'vscode-languageserver';
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
): CompletionList | undefined {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  const linePrefix = document
    .getText()
    .split('\n')
    [position.line].slice(0, position.character);
  const match = linePrefix.match(/^\s*#([\w]*)$/);
  if (!match) return;

  const typedDirective = match[1].toLowerCase();
  const hashCharacter = linePrefix.lastIndexOf('#');
  const replaceRange = Range.create(
    position.line,
    hashCharacter,
    position.line,
    position.character
  );

  const items: CompletionItem[] = PREPROCESSOR_DIRECTIVES.filter((directive) =>
    directive.slice(1).toLowerCase().startsWith(typedDirective)
  ).map((directive) => ({
    label: directive,
    kind: CompletionItemKind.Keyword,
    filterText: directive,
    textEdit: TextEdit.replace(replaceRange, directive),
  }));

  return CompletionList.create(items, true);
}
