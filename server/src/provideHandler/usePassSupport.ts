import {
  CompletionItem,
  CompletionItemKind,
  DocumentLink,
  DocumentUri,
  Location,
  Position,
  Range,
  TextEdit,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { WorkspaceIndex } from '../workspace/WorkspaceIndex';

interface IUsePassTarget {
  uri: DocumentUri;
  path: string;
  passRange: Range;
}

interface IUsePassStringContext {
  typedValue: string;
  replaceRange: Range;
}

function getSanitizedLine(line: string): string {
  return line.replace(/\/\/.*$/, '').replace(/"[^"]*"/g, '""');
}

export function getUsePassStringContext(
  docUri: DocumentUri,
  position: Position
): IUsePassStringContext | undefined {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  const lineText = document
    .getText()
    .split('\n')
    [position.line].slice(0, position.character);
  const match = lineText.match(/^\s*UsePass\s+"([^"]*)$/);
  if (!match) return;

  const typedValue = match[1];
  return {
    typedValue,
    replaceRange: Range.create(
      position.line,
      position.character - typedValue.length,
      position.line,
      position.character
    ),
  };
}

function collectUsePassTargets(): IUsePassTarget[] {
  const targets: IUsePassTarget[] = [];
  WorkspaceIndex.forEachIndexedUri((uri) => {
    const content = WorkspaceIndex.getDocumentText(uri);
    if (!content) return;

    const lines = content.split('\n');
    let depth = 0;
    let activeShader: { name: string; baseDepth: number } | undefined;
    let activeSubShader: { name: string; baseDepth: number } | undefined;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const shaderMatch = line.match(/^\s*Shader\s+"([^"]+)"/);
      if (shaderMatch) {
        activeShader = { name: shaderMatch[1], baseDepth: depth };
        activeSubShader = undefined;
      }

      const subShaderMatch = line.match(/^\s*SubShader\s+"([^"]+)"/);
      if (subShaderMatch && activeShader) {
        activeSubShader = { name: subShaderMatch[1], baseDepth: depth };
      }

      const passMatch = line.match(/^\s*Pass\s+"([^"]+)"/);
      if (passMatch && activeShader && activeSubShader) {
        const passName = passMatch[1];
        const passLabel = `"${passName}"`;
        const quoteStart = line.indexOf(passLabel);
        const startCharacter = quoteStart >= 0 ? quoteStart + 1 : 0;
        const endCharacter = startCharacter + passName.length;
        targets.push({
          uri,
          path: `${activeShader.name}/${activeSubShader.name}/${passName}`,
          passRange: Range.create(
            lineIndex,
            startCharacter,
            lineIndex,
            endCharacter
          ),
        });
      }

      const sanitized = getSanitizedLine(line);
      const openCount = (sanitized.match(/\{/g) ?? []).length;
      const closeCount = (sanitized.match(/\}/g) ?? []).length;
      depth += openCount - closeCount;

      if (activeSubShader && depth <= activeSubShader.baseDepth) {
        activeSubShader = undefined;
      }

      if (activeShader && depth <= activeShader.baseDepth) {
        activeShader = undefined;
        activeSubShader = undefined;
      }
    }
  });

  return targets;
}

export function resolveUsePassTarget(value: string): IUsePassTarget | undefined {
  return collectUsePassTargets().find((item) => item.path === value);
}

export function provideUsePassCompletion(
  docUri: DocumentUri,
  position: Position
): CompletionItem[] | undefined {
  const context = getUsePassStringContext(docUri, position);
  if (!context) return;

  return collectUsePassTargets()
    .filter((target) =>
      target.path.toLowerCase().startsWith(context.typedValue.toLowerCase())
    )
    .map((target) => ({
      label: target.path,
      kind: CompletionItemKind.Reference,
      textEdit: TextEdit.replace(context.replaceRange, target.path),
      detail: 'UsePass target',
    }));
}

export function provideUsePassDefinition(
  docUri: DocumentUri,
  position: Position
): Location | undefined {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  const lineText = document.getText().split('\n')[position.line];
  const match = lineText.match(/^\s*UsePass\s+"([^"]+)"/);
  if (!match) return;

  const value = match[1];
  const valueStart = lineText.indexOf(value);
  const valueEnd = valueStart + value.length;
  if (position.character < valueStart || position.character > valueEnd + 1) {
    return;
  }

  const target = resolveUsePassTarget(value);
  if (!target) return;

  return Location.create(target.uri, target.passRange);
}

export function provideUsePassDocumentLinks(docUri: DocumentUri): DocumentLink[] {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return [];

  const links: DocumentLink[] = [];
  const lines = document.getText().split('\n');

  for (let line = 0; line < lines.length; line++) {
    const match = lines[line].match(/^\s*UsePass\s+"([^"]+)"/);
    if (!match) continue;

    const value = match[1];
    const valueStart = lines[line].indexOf(value);
    const target = resolveUsePassTarget(value);
    if (valueStart < 0 || !target) continue;

    links.push({
      range: Range.create(line, valueStart, line, valueStart + value.length),
      target: target.uri,
      tooltip: 'Open UsePass target file',
    });
  }

  return links;
}
