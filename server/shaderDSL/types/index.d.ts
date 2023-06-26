import { ShaderParser } from "./parser";
import ShaderVisitor, { parser } from "./visitor";
import { IShaderInfo, IShaderLab } from "./interface";
export { ShaderParser, parser, ShaderVisitor };
export declare function parseShader(input: string): IShaderInfo;
export declare class ShaderLab implements IShaderLab {
    initialize(): Promise<void>;
    parseShader(shaderCode: string): IShaderInfo;
}
