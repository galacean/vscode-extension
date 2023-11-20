import { IFunctionSummary, functionSummaries } from './function-summaries';
import {
  CompletionItem,
  CompletionItemKind,
  MarkupContent,
  MarkupKind,
  ParameterInformation,
  SignatureHelp,
} from 'vscode-languageserver';
import { ENGINE_ENUMS, GLSL_VARS } from './identifiers';

export class Builtin {
  private static _singleton: Builtin;
  static getInstance() {
    if (!this._singleton) {
      this._singleton = new Builtin();
    }
    return this._singleton;
  }

  private _functions: typeof functionSummaries;

  get functionCompletions(): CompletionItem[] {
    return Object.values(this._functions).map((func) => ({
      label: func.name,
      kind: CompletionItemKind.Function,
      detail: func.summary,
      documentation: {
        kind: MarkupKind.Markdown,
        // TODO:
        value: `- [Open Documentation]()`,
      },
      data: func,
    }));
  }

  get engineEnums(): CompletionItem[] {
    return ENGINE_ENUMS.map((item) => ({
      label: item.name,
      kind: CompletionItemKind.Enum,
      detail: item.summary,
      documentation: item.summary,
      data: item,
    }));
  }

  get glslVars(): CompletionItem[] {
    return Object.values(GLSL_VARS).map((item) => ({
      label: item.name,
      kind: CompletionItemKind.Variable,
      detail: item.summary,
      documentation: item.summary,
    }));
  }

  private constructor() {
    this._functions = functionSummaries;
  }

  getFunctionInfo(fnName: string) {
    return this._functions[fnName];
  }

  static getFunctionLabel(info: IFunctionSummary) {
    const paramString = info.parameters
      .map((param) => `${param.type} ${param.name}`)
      .join(', ');

    return `${info.returnType} ${info.name}(${paramString})`;
  }

  static getFunctionSignature(info: IFunctionSummary): SignatureHelp {
    const label = this.getFunctionLabel(info);
    const documentation: MarkupContent = {
      kind: MarkupKind.Markdown,
      value: `${info.summary}\n- [Open Documentation]()`,
    };
    const parameters: ParameterInformation[] = info.parameters.map((item) => ({
      label: item.name,
      documentation: item.summary,
    }));
    return { signatures: [{ label, documentation, parameters }] };
  }
}
