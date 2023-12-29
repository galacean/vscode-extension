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

#### 流程

- [ ] 双击编辑器资产自动检查并打开 VSCode 并直接关联云端打开的项目(如用户未安装需要提示)
- [ ] 保留 git sourcecontrol，单独加一个 view 作为 galacean 源码控制窗口
- [ ] 用户上传体感更明显
- [ ] meta 字段加一个是否内置的字段，插件项目资产过滤掉内置资产
- [ ] 每个项目都需要指定本地文件夹路径 第一次打开弹窗提示

- [ ] glsl 对比

## Notes

- formatting 需要先手动 format document，指定 formatter 为 Galacean
- SourceControl 视图暂时不能像 git SourceControl 那样添加显示的 commit 按钮，不过官网正在计划添加开发相关 api，相关 issue
  - https://github.com/microsoft/vscode/issues/167410#issuecomment-1339179812
  - https://github.com/microsoft/vscode/issues/133935
