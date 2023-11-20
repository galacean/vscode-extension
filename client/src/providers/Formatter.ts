import {
  CancellationToken,
  DocumentRangeFormattingEditProvider,
  FormattingOptions,
  ProviderResult,
  Range,
  TextDocument,
  TextEdit,
  SemanticTokensLegend,
} from 'vscode';
import * as prettydiff from 'prettydiff/js/prettydiff';

const prettyOpts = prettydiff.options;
prettyOpts.brace_padding = true;
prettyOpts.indent_size = 2;
prettyOpts.mode = 'beautify';

// Align
export class FormatterProvider implements DocumentRangeFormattingEditProvider {
  provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range,
    options: FormattingOptions,
    token: CancellationToken
  ): ProviderResult<TextEdit[]> {
    prettyOpts.source = document.getText(range);
    prettyOpts.tabSize = options.tabSize;
    const output = prettydiff();
    return [new TextEdit(range, output)];
  }
}
