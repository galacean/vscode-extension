import { Diagnostic } from 'vscode-languageserver';
import {
  mapShaderSourceErrorToDiagnostics,
  parseShaderSource,
} from './shaderLabSourceRuntime';

export function validateShader(shader: string): Diagnostic[] {
  /** builtin shader */
  if (/^\s*\/\/\s*@builtin ([\w-]+)/.test(shader.split('\n')[0])) {
    return [];
  }

  if (!shader) return [];
  try {
    parseShaderSource(shader);
    return [];
  } catch (errors) {
    return mapShaderSourceErrorToDiagnostics(errors);
  }
}
