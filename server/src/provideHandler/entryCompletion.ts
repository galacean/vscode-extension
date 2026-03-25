import {
  CompletionItem,
  CompletionItemKind,
  DocumentUri,
  Position,
  Range,
  TextEdit,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';

type EntryStage = 'vertex' | 'fragment';

interface EntryAssignmentContext {
  stage: EntryStage;
  typedValue: string;
  replaceRange: Range;
}

function getEntryAssignmentContext(
  docUri: DocumentUri,
  position: Position
): EntryAssignmentContext | undefined {
  const document = ProviderContext.getInstance(docUri).document;
  if (!document) return;

  const linePrefix = document
    .getText()
    .split('\n')
    [position.line].slice(0, position.character);

  const vertexMatch = linePrefix.match(/^\s*VertexShader\s*=\s*([A-Za-z_]\w*)?$/);
  if (vertexMatch) {
    const typedValue = vertexMatch[1] ?? '';
    return {
      stage: 'vertex',
      typedValue,
      replaceRange: Range.create(
        position.line,
        position.character - typedValue.length,
        position.line,
        position.character
      ),
    };
  }

  const fragmentMatch = linePrefix.match(
    /^\s*FragmentShader\s*=\s*([A-Za-z_]\w*)?$/
  );
  if (fragmentMatch) {
    const typedValue = fragmentMatch[1] ?? '';
    return {
      stage: 'fragment',
      typedValue,
      replaceRange: Range.create(
        position.line,
        position.character - typedValue.length,
        position.line,
        position.character
      ),
    };
  }
}

function getStageDetail(stage: EntryStage) {
  return stage === 'vertex' ? 'Vertex entry' : 'Fragment entry';
}

export function provideEntryFunctionCompletion(
  docUri: DocumentUri,
  position: Position
): CompletionItem[] | undefined {
  const context = ProviderContext.getInstance(docUri);
  const semanticModel = context.semanticModel;
  const assignmentContext = getEntryAssignmentContext(docUri, position);
  if (!semanticModel || !assignmentContext) return;

  return semanticModel.symbols
    .filter((symbol) => symbol.kind === 'function')
    .filter((symbol) =>
      symbol.name
        .toLowerCase()
        .startsWith(assignmentContext.typedValue.toLowerCase())
    )
    .map((symbol) => ({
      label: symbol.name,
      kind: CompletionItemKind.Function,
      detail: getStageDetail(assignmentContext.stage),
      textEdit: TextEdit.replace(assignmentContext.replaceRange, symbol.name),
    }));
}
