import {
  CompletionItem,
  CompletionItemKind,
  DocumentUri,
  Position,
  Range,
  TextEdit,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';

const TAG_KEYS = ['pipelineStage', 'replacementTag', 'Queue'];

const TAG_VALUE_OPTIONS: Record<string, string[]> = {
  pipelineStage: ['Forward', 'ShadowCaster', 'DepthOnly'],
  Queue: ['Opaque', 'Transparent', 'Overlay'],
};

function getOffsetAt(position: Position, content: string): number {
  const lines = content.split('\n');
  let offset = 0;
  for (let index = 0; index < position.line; index++) {
    offset += lines[index].length + 1;
  }
  return offset + position.character;
}

function isInTagsBlock(content: string, position: Position): boolean {
  const offset = getOffsetAt(position, content);
  let state: 'code' | 'lineComment' | 'blockComment' | 'string' = 'code';
  let pendingTags = false;
  const stack: ('block' | 'tags')[] = [];

  for (let index = 0; index < offset; index++) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (state === 'lineComment') {
      if (char === '\n') state = 'code';
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
      if (char === '"') state = 'code';
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

    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < offset && /\w/.test(content[end])) end++;
      const word = content.slice(index, end);
      pendingTags = word === 'Tags';
      index = end - 1;
      continue;
    }

    if (char === '{') {
      stack.push(pendingTags ? 'tags' : 'block');
      pendingTags = false;
      continue;
    }

    if (char === '}') {
      stack.pop();
      pendingTags = false;
      continue;
    }

    if (!/\s/.test(char)) {
      pendingTags = false;
    }
  }

  return stack[stack.length - 1] === 'tags';
}

export function provideTagCompletion(
  docUri: DocumentUri,
  position: Position
): CompletionItem[] | undefined {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  const content = document.getText();
  if (!isInTagsBlock(content, position)) return;

  const linePrefix = content
    .split('\n')
    [position.line].slice(0, position.character);

  const valueMatch = linePrefix.match(/([A-Za-z_]\w*)\s*=\s*"([^"]*)$/);
  if (valueMatch) {
    const [, tagKey, typedValue] = valueMatch;
    const options = TAG_VALUE_OPTIONS[tagKey];
    if (!options) return [];

    const replaceRange = Range.create(
      position.line,
      position.character - typedValue.length,
      position.line,
      position.character
    );

    return options
      .filter((value) =>
        value.toLowerCase().startsWith(typedValue.toLowerCase())
      )
      .map((value) => ({
        label: value,
        kind: CompletionItemKind.Value,
        textEdit: TextEdit.replace(replaceRange, value),
      }));
  }

  const keyMatch = linePrefix.match(/([A-Za-z_]\w*)?$/);
  const typedKey = keyMatch?.[1] ?? '';
  const replaceRange = Range.create(
    position.line,
    position.character - typedKey.length,
    position.line,
    position.character
  );

  return TAG_KEYS.filter((key) =>
    key.toLowerCase().startsWith(typedKey.toLowerCase())
  ).map((key) => ({
    label: key,
    kind: CompletionItemKind.Property,
    textEdit: TextEdit.replace(replaceRange, key),
  }));
}
