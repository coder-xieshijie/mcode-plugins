# mcode-plugins

MCode 外观插件合集，附“MCode 章鱼少女”的角色素材。三个插件都是 MiniMax 格式的本地插件（`.minimax-plugin/plugin.json`），用 MCode 的插件外观扩展点交付主题、字体、壁纸、开机画面和桌宠。

| 插件 | 目录 | 内容 |
|---|---|---|
| `mcode-preset-themes` 预设主题合集 | [plugins/preset-themes](plugins/preset-themes/) | 9 套编辑器配色：Catppuccin、Dracula、Nord、Solarized、GitHub、One、Tokyo Night、Gruvbox、Rosé Pine |
| `mcode-octopus-boot` 章鱼少女开机动画 | [plugins/octopus-boot](plugins/octopus-boot/) | 开机视频，片尾溶解进主界面；3 张章鱼少女壁纸 |
| `dsh-plugin-convert` DSH 插件转换器 | [plugins/dsh-plugin-convert](plugins/dsh-plugin-convert/) | 带 Skill：把 DeepSeek Harness 插件静态转换成 MCode 外观插件，能对应到外观扩展点的都转 |

需要支持插件外观（主题、字体、壁纸、开机画面、桌宠）的 MCode 版本。只带外观的插件在旧版 MCode 上会因为“没有可用能力”而装不上。

## 角色素材

[octopus-girl/](octopus-girl/) 是“MCode 章鱼少女”的角色素材：设定图、刺青母版、启动动画和生成提示词，规则见该目录的 `AGENTS.md`。章鱼开机插件用的开机视频和三张关键帧出自这里，`plugins/octopus-boot/assets/` 里的是内容相同的副本。

## 构建

只需要 Node.js 18+，没有第三方依赖。

```sh
npm test                                   # 单测（node:test）：转换器、预设主题、章鱼插件声明
node scripts/build-preset-themes.mjs       # 从 scripts/palettes.mjs 重新生成预设主题
node scripts/check-contrast.mjs plugins/preset-themes/appearance/appearance.json
sh plugins/octopus-boot/build.sh           # 组装章鱼插件到 plugins/octopus-boot/dist/mcode-octopus-boot（用 sips 或 ffmpeg 生成封面）
```

- 预设主题：`plugins/preset-themes/` 本身就是可安装的插件目录，`appearance/appearance.json` 已生成入库。
- 章鱼插件：源码在 `package/`，视频与关键帧在 `assets/`，`build.sh` 把两者组装成安装包；壁纸已裁好入库，换素材时用 `make-wallpapers.sh` 重做（需要 `cwebp`）。
- DSH 转换器：`plugins/dsh-plugin-convert/` 就是插件目录；`scripts/build-dsh-defaults.mjs` 用于从 DeepSeek Harness 源码重新生成它的默认色阶表。

## 安装

把插件目录复制到 MCode 数据目录的 `plugins/<插件名>/`（数据目录以 MCode 当前使用的为准，默认在用户主目录的 `.minimax` 下），MCode 会自动扫描并默认启用：

| 插件 | 复制什么 |
|---|---|
| 预设主题 | `plugins/preset-themes/` → `plugins/mcode-preset-themes/` |
| 章鱼开机 | `plugins/octopus-boot/dist/mcode-octopus-boot/`（先运行 build.sh） |
| DSH 转换器 | `plugins/dsh-plugin-convert/` → `plugins/dsh-plugin-convert/` |

安装不会自动换外观。打开插件详情页的插件设置区，自己点主题的「应用」、壁纸的「用作壁纸」、开机画面的「用作开机画面」。

发到官方市场（`minimax-plugin-marketplace` 仓的 `plugins/<名>/`）时，提交的是 `build.sh` 的产物 `dist/mcode-octopus-boot/`，不是 `package/` 模板：模板不含 `pages/boot/media/`，照模板拷会让开机页引用不到 `poster.jpg`、`boot.mp4`、`end.jpg`，播放时静默失败。市场那份的 `author` 写 `MiniMax Code`，本仓保留个人署名，属有意差异。

## 校验

除了本仓库的自检，插件也可以用 MCode 本地运行时的插件读取器校验：读取器输出插件的外观贡献与诊断，零诊断即通过。

## 许可

代码 MIT（`LICENSE`）。预设主题的色板出处、章鱼少女素材（CC BY 4.0）与 DSH 默认色阶（MIT）的来源见 [NOTICE.md](NOTICE.md)。`octopus-girl/` 下的角色设定、美术和提示词按 CC BY 4.0，见 [octopus-girl/LICENSE-ARTWORK.md](octopus-girl/LICENSE-ARTWORK.md)。
