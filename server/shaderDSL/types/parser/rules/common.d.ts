import { CstParser, TokenType } from "chevrotain";
export declare const ALL_RULES: Array<{
    name: string;
    fn: (...arg: any[]) => any;
}>;
export declare function consume(this: CstParser, idx: number, tokType: TokenType): import("chevrotain").IToken;
