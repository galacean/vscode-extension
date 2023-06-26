import { CstParser, Lexer } from "chevrotain";
export declare class ShaderParser extends CstParser {
    lexer: Lexer;
    constructor();
    parse(text: string): void;
}
