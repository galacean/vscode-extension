import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { IRecognitionException } from 'chevrotain';
import { ProviderContext } from './ProviderContext';

export function validateShader(shader: string): Diagnostic[] {
  const shaderLab = ProviderContext.shaderLab;

  /** builtin shader */
  if (/^\s*\/\/\s*@builtin ([\w-]+)/.test(shader.split('\n')[0])) {
    return [];
  }

  if (!shader) return [];
  try {
    shaderLab.parseShader(shader);
    return (shaderLab as any).diagnostic ?? [];
  } catch (errors) {
    console.log(errors);
    if (Array.isArray(errors)) {
      return (<IRecognitionException[]>errors).map((item) => ({
        severity: DiagnosticSeverity.Error,
        message: item.message,
        range: {
          start: {
            line: item.token.startLine! - 1,
            character: item.token.startColumn! - 1,
          },
          end: {
            line: item.token.endLine! - 1,
            character: item.token.endColumn!,
          },
        },
      }));
    } else {
      return [
        {
          severity: DiagnosticSeverity.Error,
          message: 'Validation failed.',
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
        },
      ];
    }
  }
}
