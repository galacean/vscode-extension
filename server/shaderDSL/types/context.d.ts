import { AstNode, DeclarationAstNode, FnArgAstNode, FnAstNode, FnVariableAstNode, ReturnTypeAstNode, StructAstNode } from "./astNode";
import { IPassAstContent, IShaderAstContent, ISubShaderAstContent } from "./astNode/types";
import { IShaderPass, ISubShader, IDiagnostic, IGlobal, IShaderInfo } from "./interface";
interface IReferenceStructInfo {
    /** varying or attribute object name */
    objectName?: string;
    structAstNode?: StructAstNode;
    /** reference info */
    reference?: Array<{
        property: DeclarationAstNode;
        referenced: boolean;
        text: string;
    }>;
}
export default class RuntimeContext {
    private shaderAst;
    passAst: AstNode<IPassAstContent>;
    functionAstStack: Array<{
        fnAst: FnAstNode;
        localDeclaration: DeclarationAstNode[];
    }>;
    /** Diagnostic for linting service */
    diagnostics: Array<IDiagnostic>;
    /** The main function */
    private _currentMainFnAst?;
    /** Global variables e.g. Uniforms */
    globalList: Array<IGlobal>;
    /** global text */
    globalTextList: Array<string>;
    /** varying info */
    varyingTypeAstNode?: ReturnTypeAstNode;
    /** varying */
    varyingStructInfo: IReferenceStructInfo;
    /** attributes struct list */
    attributeStructListInfo: Array<IReferenceStructInfo>;
    /** attibutes variable list */
    attributesVariableListInfo: Array<{
        name: string;
        astNode: FnArgAstNode;
        referenced: boolean;
        text: string;
    }>;
    /** current position */
    serializingAstNode?: AstNode;
    constructor();
    get currentFunctionInfo(): {
        fnAst: FnAstNode;
        localDeclaration: DeclarationAstNode[];
    };
    subShaderReset(): void;
    passReset(): void;
    get currentMainFnAst(): FnAstNode;
    setMainFnAst(ast: FnAstNode): void;
    private _initGlobalList;
    referenceGlobal(name: string): IGlobal | undefined;
    parse(ast: AstNode<IShaderAstContent>): IShaderInfo;
    parseSubShaderInfo(ast: AstNode<ISubShaderAstContent>): ISubShader;
    parsePassInfo(ast: AstNode<IPassAstContent>): IShaderPass;
    findGlobal(variable: string): StructAstNode | FnVariableAstNode | FnArgAstNode | undefined;
    findLocal(variable: string): DeclarationAstNode | undefined;
    getAttribText(): string;
    getVaryingText(): string;
    getGlobalText(): string;
}
export {};
