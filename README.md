# Galacean VSCode Extension

## TODO

- #### shaderlab 语言相关

  - [x] completion
  - [x] signature
  - [x] hover
  - [x] grammar highlight
  - [x] snippets
  - [x] formatting

- #### 项目同步相关

  - [x] 与服务端通讯
  - [x] http client mock (cookie)
  - [x] 登录
  - [x] data pull
  - [x] data push
  - [x] source control
    - [x] stage
    - [x] diff
    - [x] push
    - [x] pull
    - [ ] packages.json 脚本依赖同步
  - [ ] glsl 内置函数提示

- #### 其它
  - [ ] walkthrough
  - [ ] 编辑器中双击 Script，Shader 跳转至 VScode

## Notes

- formatting 需要先手动 format document，指定 formatter 为 Galacean
- SourceControl 视图暂时不能像 git SourceControl 那样添加显示的 commit 按钮，不过官网正在计划添加开发相关 api，相关 issue
  - https://github.com/microsoft/vscode/issues/167410#issuecomment-1339179812
  - https://github.com/microsoft/vscode/issues/133935
