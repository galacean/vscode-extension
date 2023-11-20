import {
  CancellationToken,
  CompletionContext,
  CompletionItem,
  CompletionItemProvider,
  CompletionList,
  Position,
  ProviderResult,
  Range,
  TextDocument,
} from 'vscode';

const editorPropertiesRegex = /EditorProperties\s+\{[^}]*?\}/;

const EditorPropertyTypes = [
  'Int',
  'Boolean',
  'Float',
  'Texture2D',
  'TextureCube',
  'Color',
  'Vector2',
  'Vector3',
  'Vector4',
];

export class EditorPropertiesCompletionProvider
  implements CompletionItemProvider
{
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext
  ): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
    const docContent = document.getText();
    const match = docContent.match(editorPropertiesRegex);
    if (match?.index) {
      const offsetStart = match.index;
      const offsetEnd = offsetStart + match[0].length;
      const start = document.positionAt(offsetStart);
      const end = document.positionAt(offsetEnd);
      const editorPropertiesRange = new Range(start, end);
      if (editorPropertiesRange.contains(position)) {
        return EditorPropertyTypes.map((item) => ({
          label: item,
          detail: 'Editor Property',
        }));
      }
    }
  }
}
