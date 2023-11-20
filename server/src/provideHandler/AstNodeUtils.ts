import { Position, Range } from 'vscode-languageserver';

export type IAstNodeSelfChecker = (check: string, astNode: any) => boolean;

export class AstNodeUtils {
  static getWordAt(position: Position, docContent: string) {
    const line = docContent.split('\n')[position.line];
    const matches = line.matchAll(/\w+/g);
    for (const m of matches) {
      if (
        position.character >= m.index! &&
        position.character <= m.index! + m[0].length
      ) {
        return m[0];
      }
    }
  }

  static isPositionAfter(before: Position, after: Position) {
    if (before.line > after.line) return false;
    if (before.line === after.line) {
      return before.character <= after.character;
    }
    return true;
  }

  static inRange(position: Position, range: Range) {
    return (
      this.isPositionAfter(range.start, position) &&
      this.isPositionAfter(position, range.end)
    );
  }

  static findAstNode(
    node: string,
    root: any,
    nodeCheckerList: IAstNodeSelfChecker[] = [],
    position?: Position
  ): any {
    for (const check of nodeCheckerList) {
      if (check(node, root)) return root;
    }

    const content = root.content;
    if (!content || typeof content !== 'object') return;

    for (const prop in content) {
      const child = content[prop];
      if (child == null) continue;
      if (Array.isArray(child)) {
        for (const astNode of child) {
          const ret = this.checkChild(node, astNode, nodeCheckerList, position);
          if (ret) return ret;
        }
      } else {
        const ret = this.checkChild(node, child, nodeCheckerList, position);
        if (ret) return ret;
      }
    }
  }

  private static checkChild(
    node: string,
    astNode: any,
    nodeCheckerList: IAstNodeSelfChecker[],
    position?: Position
  ) {
    if (position) {
      if (!astNode.position) return;
      if (
        astNode._astType === 'Function' &&
        !this.inRange(position, astNode.position)
      )
        return;
    }
    return this.findAstNode(node, astNode, nodeCheckerList, position);
  }

  static fnArgAstNodeCheck(check: string, astNode: any): boolean {
    if (astNode._astType !== 'FunctionArgument') return false;
    return astNode.content?.name === check;
  }

  static renderStateNodeCheck(check: string, astNode: any): boolean {
    if (astNode._astType !== 'RenderState') return false;
    return astNode.content.variable === check;
  }

  static variableDeclarationNodeCheck(check: string, astNode: any): boolean {
    if (astNode._astType !== 'VariableDeclaration') return false;
    return (
      astNode.content.variableList[0].content.variable.content.variable ===
      check
    );
  }
}
