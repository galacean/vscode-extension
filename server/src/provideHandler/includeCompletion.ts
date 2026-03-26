import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
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

const INCLUDE_FILE_EXTENSIONS = new Set(['.gsl', '.glsl', '.gs']);

interface IncludeContext {
  directoryPath: string;
  replaceRange: Range;
  typedDirectory: string;
  typedBasename: string;
  typedValue: string;
}

export function getFilePathFromUri(uri: string): string | undefined {
  if (!uri.startsWith('file://')) return;
  return decodeURIComponent(new URL(uri).pathname);
}

export function getIncludeStringRange(
  lineText: string
): { value: string; startCharacter: number; endCharacter: number } | undefined {
  const match = lineText.match(/^\s*#include\s+"([^"]*)"?/);
  if (!match) return;

  const fullMatch = match[0];
  const quoteIndex = fullMatch.indexOf('"');
  if (quoteIndex === -1) return;

  const startCharacter = quoteIndex + 1;
  const value = match[1];
  return {
    value,
    startCharacter,
    endCharacter: startCharacter + value.length,
  };
}

export function resolveIncludeTargetUri(
  docUri: DocumentUri,
  includePath: string
): DocumentUri | undefined {
  const filePath = getFilePathFromUri(docUri);
  if (!filePath) return;

  if (!includePath.startsWith('.')) return;

  const targetPath = path.resolve(path.dirname(filePath), includePath);
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) return;

  return pathToFileURL(targetPath).toString();
}

function getIncludeContext(
  docUri: DocumentUri,
  position: Position
): IncludeContext | undefined {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  const filePath = getFilePathFromUri(docUri);
  if (!filePath) return;

  const lineText = document.getText().split('\n')[position.line];
  const includeRange = getIncludeStringRange(lineText.slice(0, position.character));
  if (!includeRange) return;

  const typedValue = includeRange.value;
  const slashIndex = Math.max(typedValue.lastIndexOf('/'), typedValue.lastIndexOf(path.sep));
  const typedDirectory = slashIndex >= 0 ? typedValue.slice(0, slashIndex + 1) : '';
  const typedBasename = slashIndex >= 0 ? typedValue.slice(slashIndex + 1) : typedValue;
  const baseDirectory = path.dirname(filePath);
  const directoryPath = path.resolve(baseDirectory, typedDirectory || '.');

  const startCharacter = position.character - typedBasename.length;
  return {
    directoryPath,
    typedDirectory,
    typedBasename,
    typedValue,
    replaceRange: Range.create(
      position.line,
      startCharacter,
      position.line,
      position.character
    ),
  };
}

export function provideIncludeDefinition(
  docUri: DocumentUri,
  position: Position
): Location | undefined {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  const filePath = getFilePathFromUri(docUri);
  if (!filePath) return;

  const lineText = document.getText().split('\n')[position.line];
  const includeRange = getIncludeStringRange(lineText);
  if (!includeRange) return;

  if (
    position.character < includeRange.startCharacter ||
    position.character > includeRange.endCharacter + 1
  ) {
    return;
  }

  const includePath = includeRange.value.trim();
  const targetUri = resolveIncludeTargetUri(docUri, includePath);
  if (!targetUri) return;

  return Location.create(targetUri, {
    start: Position.create(0, 0),
    end: Position.create(0, 0),
  });
}

export function provideIncludePathCompletion(
  docUri: DocumentUri,
  position: Position
): CompletionItem[] | undefined {
  const includeContext = getIncludeContext(docUri, position);
  if (!includeContext) return;

  if (!fs.existsSync(includeContext.directoryPath)) {
    return [];
  }

  const entries = fs.readdirSync(includeContext.directoryPath, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => {
      if (entry.name.startsWith('.')) return false;
      if (
        includeContext.typedBasename &&
        !entry.name
          .toLowerCase()
          .startsWith(includeContext.typedBasename.toLowerCase())
      ) {
        return false;
      }
      if (entry.isDirectory()) return true;
      return INCLUDE_FILE_EXTENSIONS.has(path.extname(entry.name));
    })
    .map((entry) => {
      const isDirectory = entry.isDirectory();
      const replacement = `${entry.name}${isDirectory ? '/' : ''}`;
      return {
        label: replacement,
        kind: isDirectory
          ? CompletionItemKind.Folder
          : CompletionItemKind.File,
        textEdit: TextEdit.replace(includeContext.replaceRange, replacement),
        filterText: `${includeContext.typedDirectory}${replacement}`,
      };
    });
}

export function provideIncludeDocumentLinks(docUri: DocumentUri): DocumentLink[] {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return [];

  const links: DocumentLink[] = [];
  const lines = document.getText().split('\n');

  for (let line = 0; line < lines.length; line++) {
    const includeRange = getIncludeStringRange(lines[line]);
    if (!includeRange) continue;

    const target = resolveIncludeTargetUri(docUri, includeRange.value.trim());
    if (!target) continue;

    links.push({
      range: Range.create(
        line,
        includeRange.startCharacter,
        line,
        includeRange.endCharacter
      ),
      target,
      tooltip: 'Open include target',
    });
  }

  return links;
}
