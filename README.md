# XQ Plugins

欢迎使用 xiaoqvan 的bot插件！这个项目是 [FuyuBot](https://github.com/CatMoeCircle/FuyuBot) (Telegram BOT)的插件

## 功能

- **/music**：163音乐解析
- **/douyin**：抖音视频解析
- **/kuashou**：快手视频解析
- **/ppx**：皮皮虾视频解析
- 更多功能等待开发
## 安装

确保已经克隆[FuyuBot](https://github.com/CatMoeCircle/FuyuBot)

进入bot的根目录，执行以下命令来安装本插件

你可以使用npm或者pnpm

```
git clone https://github.com/xiaoqvan/xq-plugins.git ./plugins/XQ-plugins
cd ./plugins/XQ-plugins

npm install
```

## 配置
首次使用音乐解析后会在 `163Music\api` 目录下生成一个 `163cookie.yaml` 文件，在 `MUSIC_U` 中填入你的cookie，然后重启bot。

## 单独调用
在每个api文件夹中你可以单独调用每个文件导出函数
需要初始化并安装依赖
Linux 系统下补全`puppeteer`环境 https://pptr.dev/troubleshooting#chrome-doesnt-launch-on-linux
```bash
# 安装依赖
npm install js-yaml puppeteer puppeteer-core
# or
pnpm install js-yaml puppeteer puppeteer-core
```