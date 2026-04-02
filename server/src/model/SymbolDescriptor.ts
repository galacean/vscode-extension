export interface IFunctionParameterDescriptor {
  name: string;
  type: string;
}

export type SymbolKind = 'function' | 'struct' | 'variable' | 'renderState';

interface IBaseSymbolDescriptor {
  kind: SymbolKind;
  name: string;
  startOffset: number;
  endOffset: number;
  selectionStartOffset: number;
  selectionEndOffset: number;
  containerName?: string;
}

export interface IFunctionSymbolDescriptor extends IBaseSymbolDescriptor {
  kind: 'function';
  returnType: string;
  parameters: IFunctionParameterDescriptor[];
}

export interface IStructFieldDescriptor {
  name: string;
  type: string;
}

export interface IStructSymbolDescriptor extends IBaseSymbolDescriptor {
  kind: 'struct';
  fields: IStructFieldDescriptor[];
}

export interface IVariableSymbolDescriptor extends IBaseSymbolDescriptor {
  kind: 'variable';
  type: string;
}

export interface IRenderStateSymbolDescriptor extends IBaseSymbolDescriptor {
  kind: 'renderState';
  type: 'BlendState' | 'DepthState' | 'StencilState' | 'RasterState';
}

export type SymbolDescriptor =
  | IFunctionSymbolDescriptor
  | IStructSymbolDescriptor
  | IVariableSymbolDescriptor
  | IRenderStateSymbolDescriptor;
