import {
  CompletionContext,
  CompletionItem,
  CompletionItemKind,
  CompletionTriggerKind,
  DocumentUri,
  Position,
} from 'vscode-languageserver';
import { Builtin } from '../builtin';
import { CompletionData, ProviderContext } from './ProviderContext';
import { createCompletionByDot } from './utils';

function getCompletionType(astType: string) {
  switch (astType) {
    case 'Function':
      return CompletionItemKind.Function;
    case 'Struct':
      return CompletionItemKind.Struct;
    case 'ShaderProperty':
    default:
      return CompletionItemKind.Variable;
  }
}

function getShaderLabUserGlobalList() {
  const context = (<any>ProviderContext.shaderLab).context;
  const ret: CompletionItem[] = [];
  if (!context) return [];
  const getGlobal = (globalMap: Map<string, any>) => {
    for (const [name, data] of globalMap) {
      ret.push({
        label: name,
        data: data.ast,
        kind: getCompletionType(data.ast?._astType),
      });
    }
  };
  getGlobal(<Map<string, any>>context?._shaderGlobalMap);
  getGlobal(<Map<string, any>>context?._subShaderGlobalMap);
  getGlobal(<Map<string, any>>context?._passGlobalMap);

  return ret;
}

export function provideCompletion(
  docUri: DocumentUri,
  position: Position,
  context?: CompletionContext
): CompletionItem[] | undefined {
  if (context?.triggerKind === CompletionTriggerKind.TriggerCharacter) {
    return createCompletionByDot(position, docUri);
  } else {
    const builtin = Builtin.getInstance();
    ProviderContext.curCompletionData = new CompletionData(docUri, position);
    return [
      ...getShaderLabUserGlobalList(),
      ...builtin.functionCompletions,
      ...builtin.engineEnums,
      ...builtin.glslVars,
    ];
  }
}
