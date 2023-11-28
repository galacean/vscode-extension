import { window } from 'vscode';
import Command from './Command';
import HostContext from '../context/HostContext';
import { authCode, fetchProjectList, login } from '../utils/request';
import Project from '../models/Project';

export default class Login extends Command {
  name: string = 'galacean.login';
  mailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

  async callback() {
    let userMail = HostContext.instance.getConfig<string>('user.mail');
    const userInfo = await window.withProgress<IUserInfo>(
      { location: { viewId: 'project-list' }, title: 'logging in' },
      () => {
        return new Promise(async (resolve, reject) => {
          if (!userMail) {
            userMail = await window.showInputBox({
              title: 'Enter your login email',
              value: 'xxx@yyy.zzz',
              prompt:
                'You can configure it in the setting `galacean.user.mail` to avoid this prompt.',
              ignoreFocusOut: true,
            });
          }

          if (!this.mailRegex.test(userMail)) {
            window.showErrorMessage('invalid email');
            reject('');
          }

          await login(userMail).catch((e) => reject(e));

          const code = await window.showInputBox({
            title: `Please enter the verification code received in email ${userMail}`,
            ignoreFocusOut: true,
          });

          resolve(authCode(code, userMail));
        });
      }
    );

    window.showInformationMessage('login success');
    HostContext.userContext.userInfo = userInfo;
    HostContext.userContext.projectList = (await fetchProjectList()).map(
      (item) => new Project(item)
    );
  }
}
