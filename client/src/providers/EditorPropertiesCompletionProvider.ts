import {
  CancellationToken,
  CompletionContext,
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  CompletionList,
  Position,
  ProviderResult,
  TextDocument,
} from 'vscode';

const EditorPropertyTypes = [
  'Int',
  'Boolean',
  'Float',
  'Range',
  'Texture2D',
  'TextureCube',
  'Color',
  'HDRColor',
  'Vector2',
  'Vector3',
  'Vector4',
  'Enum',
];

type ScanState = 'code' | 'lineComment' | 'blockComment' | 'string';

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierChar(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}

function isInsideEditorPropertiesBlock(source: string, offset: number): boolean {
  const blockStack: Array<string | null> = [];
  let pendingBlockName: string | null = null;
  let state: ScanState = 'code';

  for (let index = 0; index < offset; index++) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (state === 'lineComment') {
      if (char === '\n') {
        state = 'code';
      }
      continue;
    }

    if (state === 'blockComment') {
      if (char === '*' && nextChar === '/') {
        state = 'code';
        index++;
      }
      continue;
    }

    if (state === 'string') {
      if (char === '\\') {
        index++;
        continue;
      }
      if (char === '"') {
        state = 'code';
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      state = 'lineComment';
      index++;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      state = 'blockComment';
      index++;
      continue;
    }

    if (char === '"') {
      state = 'string';
      continue;
    }

    if (isIdentifierStart(char)) {
      let end = index + 1;
      while (end < offset && isIdentifierChar(source[end])) {
        end++;
      }

      const identifier = source.slice(index, end);
      if (identifier === 'Editor' || identifier === 'Properties') {
        pendingBlockName = identifier;
      } else if (identifier !== 'Header') {
        pendingBlockName = null;
      }

      index = end - 1;
      continue;
    }

    if (char === '{') {
      blockStack.push(pendingBlockName);
      pendingBlockName = null;
      continue;
    }

    if (char === '}') {
      blockStack.pop();
      pendingBlockName = null;
      continue;
    }
  }

  const propertiesIndex = blockStack.lastIndexOf('Properties');
  if (propertiesIndex === -1) {
    return false;
  }

  return blockStack.slice(0, propertiesIndex).includes('Editor');
}

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

    if (isInsideEditorPropertiesBlock(docContent, document.offsetAt(position))) {
      return EditorPropertyTypes.map((item) => ({
        label: item,
        kind: CompletionItemKind.EnumMember,
        detail: 'ShaderLab editor property type',
      }));
    }
  }
}
