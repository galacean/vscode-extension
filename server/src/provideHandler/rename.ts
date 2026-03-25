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

export function providePrepareRename(
  uri: string,
  position: { line: number; character: number }
): PrepareRenameResult | undefined {
  const context = ProviderContext.getInstance(uri);
  const document = context.document;
  const semanticModel = context.semanticModel;
  if (!document || !semanticModel) return;

  if (!AstNodeUtils.isCodePosition(position, document.getText())) return;

  const word = getLookupWord(uri, position);
  if (!word) return;

  const symbol = semanticModel.symbolsByName.get(word);
  if (!symbol) return;

  return {
    range: Range.create(
      document.positionAt(symbol.selectionStartOffset),
      document.positionAt(symbol.selectionEndOffset)
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
