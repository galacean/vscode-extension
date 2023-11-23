import {
  CompletionItem,
  CompletionItemKind,
  DocumentUri,
  ParameterInformation,
  Position,
  Range,
} from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { AstNodeUtils } from './AstNodeUtils';
import { ENGINE_ENUMS } from '../builtin/identifiers';

function createRenderStatePropertyCompletion(astNode: any): CompletionItem[] {
  return astNode.content.properties.map((item: any) => ({
    label: item.content.property,
    kind: CompletionItemKind.Field,
  }));
}

function createStructPropertiesCompletion(astNode: any): CompletionItem[] {
  return astNode.content.variables.map((item: any) => ({
    label: item.content.variableNode.content.variable,
    kind: CompletionItemKind.Field,
    detail: item.content.type.content.text,
  }));
}

function createUserDefineFunctionDescribe(astNode: any) {
  const paramString = astNode.content.args
    ?.map((arg: any) => `${arg.content.type.text} ${arg.content.name}`)
    .join(', ');
  return `${astNode.content.returnType.content.text} ${astNode.content.name}(${
    paramString ?? 'void'
  })`;
}

function createUserDefineFunctionSignature(astNode: any) {
  const label = createUserDefineIdentifierDescribe(astNode);

  const parameters: ParameterInformation[] = astNode.content.args.map(
    (item: any) => ({ label: item.content.name })
  );
  return { signatures: [{ label, parameters }] };
}

export function createSignatureFromAstNode(astNode: any) {
  switch (astNode._astType) {
    case 'Function':
      return createUserDefineFunctionSignature(astNode);
  }
}

export function createCompletionFromAstNode(
  astNode: any
): CompletionItem[] | undefined {
  let ret: CompletionItem[] | undefined;
  switch (astNode?._astType) {
    case 'RenderState':
      ret = createRenderStatePropertyCompletion(astNode);
      break;
    case 'Struct':
      ret = createStructPropertiesCompletion(astNode);
      break;
  }
  return ret;
}

export function createUserDefineIdentifierDescribe(astNode: any) {
  switch (astNode._astType) {
    case 'Function':
      return createUserDefineFunctionDescribe(astNode);
    default:
      return '';
  }
}

export function createCompletionByDot(
  position: Position,
  docUri: DocumentUri
): CompletionItem[] | undefined {
  const docContent = ProviderContext.getInstance(docUri).document!.getText();
  const word = AstNodeUtils.getWordAt(
    { ...position, character: position.character - 1 },
    docContent
  );

  const context = (<any>ProviderContext.shaderLab).context;
  if (word) {
    const engineEnum = ENGINE_ENUMS.find((item) => item.name === word);
    if (engineEnum) {
      return engineEnum.properties.map((prop) => ({
        label: prop.name,
        detail: prop.summary,
        documentation: prop.summary,
      }));
    }

    const astNode = AstNodeUtils.findAstNode(
      word,
      context._shaderAst,
      [
        AstNodeUtils.fnArgAstNodeCheck,
        AstNodeUtils.renderStateNodeCheck,
        AstNodeUtils.variableDeclarationNodeCheck,
      ],
      position
    );
    if (astNode) {
      if (astNode._astType === 'FunctionArgument') {
        const gType = context.findGlobal(astNode.content.type.text)?.ast;
        return createCompletionFromAstNode(gType);
      } else if (astNode._astType === 'VariableDeclaration') {
        const gType = context.findGlobal(
          astNode.content.type.content.text
        )?.ast;
        return createCompletionFromAstNode(gType);
      } else {
        return createCompletionFromAstNode(astNode);
      }
    }
  }

  return;
}
