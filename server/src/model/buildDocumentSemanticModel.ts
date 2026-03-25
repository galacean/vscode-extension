import {
  CompletionItem,
  CompletionItemKind,
  ParameterInformation,
} from 'vscode-languageserver';
import {
  IFunctionParameterDescriptor,
  IFunctionSymbolDescriptor,
  IRenderStateSymbolDescriptor,
  IStructFieldDescriptor,
  IStructSymbolDescriptor,
  IVariableSymbolDescriptor,
  SymbolDescriptor,
} from './SymbolDescriptor';
import { parseShaderSource } from '../provideHandler/shaderLabSourceRuntime';

const RESERVED_IDENTIFIERS = new Set([
  'Shader',
  'SubShader',
  'Pass',
  'Editor',
  'Properties',
  'Macros',
  'UIScript',
  'UsePass',
  'Tags',
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'return',
  'break',
  'continue',
  'discard',
]);

const RENDER_STATE_FIELDS: Record<
  IRenderStateSymbolDescriptor['type'],
  IStructFieldDescriptor[]
> = {
  BlendState: [
    { name: 'Enabled', type: 'bool' },
    { name: 'ColorBlendOperation', type: 'BlendOperation' },
    { name: 'AlphaBlendOperation', type: 'BlendOperation' },
    { name: 'SourceColorBlendFactor', type: 'BlendFactor' },
    { name: 'SourceAlphaBlendFactor', type: 'BlendFactor' },
    { name: 'DestinationColorBlendFactor', type: 'BlendFactor' },
    { name: 'DestinationAlphaBlendFactor', type: 'BlendFactor' },
    { name: 'ColorWriteMask', type: 'ColorWriteMask' },
    { name: 'BlendColor', type: 'Color' },
    { name: 'AlphaToCoverage', type: 'bool' },
  ],
  DepthState: [
    { name: 'Enabled', type: 'bool' },
    { name: 'WriteEnabled', type: 'bool' },
    { name: 'CompareFunction', type: 'CompareFunction' },
  ],
  StencilState: [
    { name: 'Enabled', type: 'bool' },
    { name: 'ReferenceValue', type: 'int' },
    { name: 'Mask', type: 'float' },
    { name: 'WriteMask', type: 'float' },
    { name: 'CompareFunctionFront', type: 'CompareFunction' },
    { name: 'CompareFunctionBack', type: 'CompareFunction' },
    { name: 'PassOperationFront', type: 'StencilOperation' },
    { name: 'PassOperationBack', type: 'StencilOperation' },
    { name: 'FailOperationFront', type: 'StencilOperation' },
    { name: 'FailOperationBack', type: 'StencilOperation' },
    { name: 'ZFailOperationFront', type: 'StencilOperation' },
    { name: 'ZFailOperationBack', type: 'StencilOperation' },
  ],
  RasterState: [
    { name: 'CullMode', type: 'CullMode' },
    { name: 'FillMode', type: 'FillMode' },
    { name: 'DepthBias', type: 'float' },
    { name: 'SlopeScaledDepthBias', type: 'float' },
  ],
};

interface IFunctionRange {
  descriptor: IFunctionSymbolDescriptor;
  startOffset: number;
  bodyStartOffset: number;
  endOffset: number;
}

export interface DocumentSemanticModel {
  readonly source: unknown;
  readonly symbols: SymbolDescriptor[];
  readonly symbolsByName: Map<string, SymbolDescriptor>;
  readonly functions: IFunctionRange[];
  readonly globalTypeMap: Map<string, string>;
  getVisibleType(identifier: string, offset: number): string | undefined;
  getFieldsForType(typeName: string): IStructFieldDescriptor[] | undefined;
}

function parseParameters(source: string): IFunctionParameterDescriptor[] {
  return source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const normalized = item.replace(
        /\b(const|inout|in|out|highp|mediump|lowp)\b/g,
        ''
      );
      const tokens = normalized.trim().split(/\s+/).filter(Boolean);
      if (tokens.length < 2) return undefined;
      return {
        name: tokens[tokens.length - 1],
        type: tokens.slice(0, -1).join(' '),
      };
    })
    .filter(Boolean) as IFunctionParameterDescriptor[];
}

function findMatchingBrace(source: string, braceIndex: number): number {
  let depth = 0;
  let state: 'code' | 'lineComment' | 'blockComment' | 'string' = 'code';

  for (let index = braceIndex; index < source.length; index++) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (state === 'lineComment') {
      if (char === '\n') state = 'code';
      continue;
    }

    if (state === 'blockComment') {
      if (char === '*' && nextChar === '/') {
        state = 'code';
        index++;
      }
      continue;
    }

    if (state === 'string') {
      if (char === '\\') {
        index++;
        continue;
      }
      if (char === '"') state = 'code';
      continue;
    }

    if (char === '/' && nextChar === '/') {
      state = 'lineComment';
      index++;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      state = 'blockComment';
      index++;
      continue;
    }

    if (char === '"') {
      state = 'string';
      continue;
    }

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return index;
    }
  }

  return source.length - 1;
}

function scanStructs(source: string) {
  const structs: IStructSymbolDescriptor[] = [];
  const structMatcher = /struct\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}\s*;?/g;

  for (const match of source.matchAll(structMatcher)) {
    const [, name, body] = match;
    const fields: IStructFieldDescriptor[] = [];
    const fieldMatcher = /\b([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*;/g;
    for (const field of body.matchAll(fieldMatcher)) {
      fields.push({ type: field[1], name: field[2] });
    }
    structs.push({ kind: 'struct', name, fields });
  }

  return structs;
}

function scanRenderStates(source: string) {
  const states: IRenderStateSymbolDescriptor[] = [];
  const matcher =
    /^\s*(BlendState|DepthState|StencilState|RasterState)\s+([A-Za-z_]\w*)\s*\{/gm;

  for (const match of source.matchAll(matcher)) {
    states.push({
      kind: 'renderState',
      type: match[1] as IRenderStateSymbolDescriptor['type'],
      name: match[2],
    });
  }

  return states;
}

function scanFunctions(source: string): IFunctionRange[] {
  const functions: IFunctionRange[] = [];
  const matcher =
    /^\s*([A-Za-z_]\w*(?:\s+[A-Za-z_]\w*)*)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/gm;

  for (const match of source.matchAll(matcher)) {
    const [fullMatch, returnType, name, params] = match;
    if (RESERVED_IDENTIFIERS.has(name) || name === 'Header') continue;
    const braceOffset = match.index! + fullMatch.lastIndexOf('{');
    const endOffset = findMatchingBrace(source, braceOffset);
    functions.push({
      descriptor: {
        kind: 'function',
        name,
        returnType: returnType.trim(),
        parameters: parseParameters(params),
      },
      startOffset: match.index!,
      bodyStartOffset: braceOffset + 1,
      endOffset,
    });
  }

  return functions;
}

function scanGlobalVariables(source: string): IVariableSymbolDescriptor[] {
  const variables: IVariableSymbolDescriptor[] = [];
  const matcher =
    /^\s*([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(?:=\s*[^;]+)?;/gm;

  for (const match of source.matchAll(matcher)) {
    const [, type, name] = match;
    if (RESERVED_IDENTIFIERS.has(type) || RESERVED_IDENTIFIERS.has(name)) {
      continue;
    }
    variables.push({ kind: 'variable', type, name });
  }

  return variables;
}

function scanGlobalVariablesOutsideFunctions(
  source: string,
  functions: IFunctionRange[]
) {
  return scanGlobalVariables(source).filter((item) => {
    const declarationPattern = new RegExp(`\\b${item.type}\\s+${item.name}\\b`);
    const match = declarationPattern.exec(source);
    if (!match) return true;

    const declarationOffset = match.index;
    return !functions.some(
      (fn) =>
        declarationOffset >= fn.bodyStartOffset &&
        declarationOffset <= fn.endOffset
    );
  });
}

function scanScopedVariables(source: string): Map<string, string> {
  const visibleTypes = new Map<string, string>();
  const matcher =
    /(?:^|\n)\s*([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(?:=\s*[^;]+)?;/g;

  for (const match of source.matchAll(matcher)) {
    const [, type, name] = match;
    if (!RESERVED_IDENTIFIERS.has(type) && !RESERVED_IDENTIFIERS.has(name)) {
      visibleTypes.set(name, type);
    }
  }

  return visibleTypes;
}

function toCompletionKind(symbol: SymbolDescriptor): CompletionItemKind {
  switch (symbol.kind) {
    case 'function':
      return CompletionItemKind.Function;
    case 'struct':
      return CompletionItemKind.Struct;
    case 'renderState':
      return CompletionItemKind.Class;
    case 'variable':
    default:
      return CompletionItemKind.Variable;
  }
}

export function createUserDescribe(symbol: SymbolDescriptor): string {
  switch (symbol.kind) {
    case 'function': {
      const params = symbol.parameters
        .map((item) => `${item.type} ${item.name}`)
        .join(', ');
      return `${symbol.returnType} ${symbol.name}(${params || 'void'})`;
    }
    case 'struct':
      return `struct ${symbol.name}`;
    case 'renderState':
      return `${symbol.type} ${symbol.name}`;
    case 'variable':
      return `${symbol.type} ${symbol.name}`;
  }
}

export function createSignatureFromSymbol(symbol: SymbolDescriptor) {
  if (symbol.kind !== 'function') return;

  const label = createUserDescribe(symbol);
  const parameters: ParameterInformation[] = symbol.parameters.map((item) => ({
    label: item.name,
  }));
  return { signatures: [{ label, parameters }] };
}

export function createCompletionItemsForFields(
  fields: IStructFieldDescriptor[]
): CompletionItem[] {
  return fields.map((item) => ({
    label: item.name,
    kind: CompletionItemKind.Field,
    detail: item.type,
  }));
}

export function buildDocumentSemanticModel(
  source: string
): DocumentSemanticModel {
  let shaderSource: unknown;
  try {
    shaderSource = parseShaderSource(source);
  } catch {
    shaderSource = undefined;
  }

  const structs = scanStructs(source);
  const renderStates = scanRenderStates(source);
  const functions = scanFunctions(source);
  const globals = scanGlobalVariablesOutsideFunctions(source, functions);
  const symbolList = [
    ...structs,
    ...renderStates,
    ...functions.map((item) => item.descriptor),
    ...globals,
  ];
  const symbolKeySet = new Set<string>();
  const symbols = symbolList.filter((symbol) => {
    const key = `${symbol.kind}:${symbol.name}`;
    if (symbolKeySet.has(key)) {
      return false;
    }
    symbolKeySet.add(key);
    return true;
  });

  const symbolsByName = new Map<string, SymbolDescriptor>();
  const globalTypeMap = new Map<string, string>();

  for (const symbol of symbols) {
    if (!symbolsByName.has(symbol.name)) {
      symbolsByName.set(symbol.name, symbol);
    }

    if (symbol.kind === 'variable' || symbol.kind === 'renderState') {
      globalTypeMap.set(symbol.name, symbol.type);
    }
  }

  return {
    source: shaderSource,
    symbols,
    symbolsByName,
    functions,
    globalTypeMap,
    getVisibleType(identifier: string, offset: number) {
      const fn = functions.find(
        (item) => offset >= item.startOffset && offset <= item.endOffset
      );

      if (fn) {
        for (const param of fn.descriptor.parameters) {
          if (param.name === identifier) return param.type;
        }

        const scopedSource = source.slice(fn.bodyStartOffset, offset);
        const scopedTypes = scanScopedVariables(scopedSource);
        const scopedType = scopedTypes.get(identifier);
        if (scopedType) return scopedType;
      }

      return globalTypeMap.get(identifier);
    },
    getFieldsForType(typeName: string) {
      if (typeName in RENDER_STATE_FIELDS) {
        return RENDER_STATE_FIELDS[
          typeName as IRenderStateSymbolDescriptor['type']
        ];
      }

      const symbol = symbolsByName.get(typeName);
      if (symbol?.kind === 'struct') {
        return symbol.fields;
      }
    },
  };
}

export function createCompletionItemFromSymbol(symbol: SymbolDescriptor) {
  return {
    label: symbol.name,
    kind: toCompletionKind(symbol),
    detail: createUserDescribe(symbol),
    data: symbol,
  };
}
