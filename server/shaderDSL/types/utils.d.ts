import { CstElement, CstNode, ICstVisitor, IToken, CstChildrenDictionary } from "chevrotain";
import { AstNode, ObjectAstNode } from "./astNode";
import { IPositionRange } from "./astNode/types";
export declare function isCstNode(node: any): boolean;
export declare function extractCstToken(ctx: CstNode | CstChildrenDictionary, opts?: {
    fnToken?: (element: IToken) => any;
    fnNode?: (element: CstNode) => any;
}): any;
export declare function defaultVisit(this: ICstVisitor<any, AstNode>, ctx: CstChildrenDictionary): ObjectAstNode;
/**
 * order not guaranteed
 */
export declare function extractCstString(node: CstElement): string[];
/**
 * get token position
 */
export declare function getTokenPosition(token: IToken): IPositionRange;
/**
 * get OR type CstNode position
 */
export declare function getOrTypeCstNodePosition(node: IToken | {
    children: CstChildrenDictionary;
}): IPositionRange;
export declare function astSortAsc(a: AstNode, b: AstNode): 1 | -1;
export declare function astSortDesc(a: AstNode, b: AstNode): number;
