import { ExtensionContext, ProgressLocation, commands, window } from 'vscode';
import { codeVerification, signinByMail, getUserInfo } from '../request';
import { showUserInfoStatusBar } from '../utils';
import { initProjectView } from '../views/projectView';

export function CommandSignin(context: ExtensionContext) {
  return commands.registerCommand('galacean.signin', async () => {
    const email = await window.showInputBox({
      title: 'Input Account email',
      placeHolder: 'xxxxxx@gmail.com',
      ignoreFocusOut: true,
    });
    if (!email) return;
    let signPromise: Promise<void>;
    window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: 'Galacean Request',
        cancellable: true,
      },
      (progress, token) => {
        progress.report({ increment: 10, message: 'requesting ...' });
        signPromise = signinByMail(email).finally(() =>
          progress.report({ increment: 100 })
        );
        return signPromise;
      }
    );

    signPromise.then(async () => {
      const authCode = await window.showInputBox({
        title: 'Input the verification code sent to your email',
        ignoreFocusOut: true,
      });
      if (!authCode) return;
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: 'Galacean Request',
          cancellable: true,
        },
        (process) => {
          process.report({ increment: 10, message: 'authenticating ...' });
          return codeVerification(authCode, email).then(() => {
            window.showInformationMessage('Login Success!');
            process.report({ increment: 100 });
          });
        }
      );
    });
  });
}

// export function CommandFetchUserDetail(context: ExtensionContext) {
//   return commands.registerCommand('galacean.userInfo', async () => {
//     const userInfo = await getUserInfo();
//     showUserInfoStatusBar(context, `Galacean: ${userInfo.data.data.name}`);
//     initProjectView(context);
//   });
// }
