import {
  Diagnostic,
  TextDocument,
  TextDocumentChangeEvent,
  _Connection,
} from 'vscode-languageserver/node';
import { parseShader } from '../../shaderDSL';
import { IRecognitionException } from 'chevrotain';

export function makeDocumentValidationHandler(connection: _Connection) {
  return async function (event: TextDocumentChangeEvent<TextDocument>) {
    const text = event.document.getText();
    try {
      const shaderInfo = parseShader(text);
      if (shaderInfo.diagnostics.length > 0) {
        connection.sendDiagnostics({
          uri: event.document.uri,
          diagnostics: shaderInfo.diagnostics.map((item) => ({
            message: item.message,
            severity: item.severity,
            range: {
              start: {
                line: item.token.start.line - 1,
                character: item.token.start.offset - 1,
              },
              end: {
                line: item.token.end.line - 1,
                character: item.token.end.offset,
              },
            },
          })),
        });
      }
    } catch (e) {
      if (Array.isArray(e)) {
        const errors = e as IRecognitionException[];
        const diagnostics: Diagnostic[] = errors.map((e) => ({
          range: {
            start: {
              line: e.token.startLine! - 1,
              character: e.token.startColumn! - 1,
            },
            end: { line: e.token.endLine!, character: e.token.endColumn! },
          },
          message: e.message,
        }));
        connection.sendDiagnostics({ uri: event.document.uri, diagnostics });
      } else throw e;
    }
  };
}
