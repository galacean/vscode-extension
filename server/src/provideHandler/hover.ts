import { Hover, Position, Range, DocumentUri } from 'vscode-languageserver';
import { ProviderContext } from './ProviderContext';
import { provideCompletion } from './completion';
import { createUserDefineIdentifierDescribe } from './utils';
import { Builtin } from '../builtin';
import { AstNodeUtils } from './AstNodeUtils';

export function provideHover(
  docUir: DocumentUri,
  position: Position
): Hover | undefined {
  const word = AstNodeUtils.getWordAt(
    { ...position, character: position.character - 1 },
    ProviderContext.getInstance(docUir).document!.getText()
  );
  if (word) {
    const hints = provideCompletion(docUir, position)?.filter(
      (item) => item.label === word
    );
    return {
      contents:
        hints?.map((item) => {
          if (item.data._astType) {
            return createUserDefineIdentifierDescribe(item.data);
          } else {
            return Builtin.getFunctionLabel(item.data);
          }
        }) ?? [],
    };
  }
}
