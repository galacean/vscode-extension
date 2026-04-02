import {
  PrepareRenameResult,
  Range,
  RenameParams,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { AstNodeUtils } from './AstNodeUtils';
import { collectReferences, getLookupWord } from './references';
import { WorkspaceIndex } from '../workspace/WorkspaceIndex';

export function providePrepareRename(
  uri: string,
  position: { line: number; character: number }
): PrepareRenameResult | undefined {
  const context = ProviderContext.getInstance(uri);
  const semanticModel = context.semanticModel;
  const text = context.document?.getText();
  if (!text || !semanticModel) return;

  if (!AstNodeUtils.isCodePosition(position, text)) return;

  const word = getLookupWord(uri, position);
  if (!word) return;

  const symbol = semanticModel.symbolsByName.get(word);
  if (!symbol) return;

  return {
    range: Range.create(
      WorkspaceIndex.positionAt(text, symbol.selectionStartOffset),
      WorkspaceIndex.positionAt(text, symbol.selectionEndOffset)
    ),
    placeholder: symbol.name,
  };
}

export function provideRename(params: RenameParams): WorkspaceEdit | undefined {
  const result = collectReferences(params.textDocument.uri, params.position);
  if (!result) return;

  const changes: WorkspaceEdit['changes'] = {};
  for (const location of result.locations) {
    if (!changes[location.uri]) {
      changes[location.uri] = [];
    }

    changes[location.uri]!.push(
      TextEdit.replace(location.range, params.newName)
    );
  }

  return { changes };
}
