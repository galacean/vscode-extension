import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';

type ShaderLabSourceModule = {
  ShaderLab: new () => {
    _parseShaderSource(sourceCode: string): unknown;
  };
  GSError: new (...args: any[]) => Error;
};

let shaderLabSourceModule: ShaderLabSourceModule | undefined;
let shaderLabSourceInstance:
  | {
      _parseShaderSource(sourceCode: string): unknown;
    }
  | undefined;

function ensureNodeCompatibleWindow() {
  const runtimeWindow = ((globalThis as any).window ??= {});
  runtimeWindow.AudioContext ??= undefined;
  runtimeWindow.webkitAudioContext ??= undefined;
  runtimeWindow.TextMetrics ??= undefined;
}

function getShaderLabSourceModule(): ShaderLabSourceModule {
  if (!shaderLabSourceModule) {
    ensureNodeCompatibleWindow();
    shaderLabSourceModule = require('@galacean/engine-shaderlab');
  }

  return shaderLabSourceModule!;
}

export function parseShaderSource(shader: string) {
  if (!shaderLabSourceInstance) {
    const { ShaderLab } = getShaderLabSourceModule();
    shaderLabSourceInstance = new ShaderLab();
  }

  return shaderLabSourceInstance._parseShaderSource(shader);
}

export function mapShaderSourceErrorToDiagnostics(error: unknown): Diagnostic[] {
  const { GSError } = getShaderLabSourceModule();
  if (error instanceof GSError) {
    const location = (error as any).location;

    if (location?.start && location?.end) {
      return [
        {
          severity: DiagnosticSeverity.Error,
          message: error.message,
          range: {
            start: {
              line: Math.max((location.start.line ?? 1) - 1, 0),
              character: Math.max(location.start.column ?? 0, 0),
            },
            end: {
              line: Math.max((location.end.line ?? 1) - 1, 0),
              character: Math.max(location.end.column ?? 0, 0),
            },
          },
        },
      ];
    }

    return [
      {
        severity: DiagnosticSeverity.Error,
        message: error.message,
        range: {
          start: {
            line: Math.max((location?.line ?? 1) - 1, 0),
            character: Math.max(location?.column ?? 0, 0),
          },
          end: {
            line: Math.max((location?.line ?? 1) - 1, 0),
            character: Math.max((location?.column ?? 0) + 1, 1),
          },
        },
      },
    ];
  }

  if (error instanceof Error) {
    return [
      {
        severity: DiagnosticSeverity.Error,
        message: error.message || 'Validation failed.',
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
      },
    ];
  }

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
