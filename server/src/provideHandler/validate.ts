import { Diagnostic } from 'vscode-languageserver';
import {
  mapShaderSourceErrorToDiagnostics,
  parseShaderSource,
} from './shaderLabSourceRuntime';

function shouldValidateAsShaderSource(shader: string, uri?: string): boolean {
  if (uri?.toLowerCase().endsWith('.gsl')) return false;
  return /\bShader\s*"/.test(shader);
}

export function validateShader(shader: string, uri?: string): Diagnostic[] {
  /** builtin shader */
  if (/^\s*\/\/\s*@builtin ([\w-]+)/.test(shader.split('\n')[0])) {
    return [];
  }

  if (!shouldValidateAsShaderSource(shader, uri)) {
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
