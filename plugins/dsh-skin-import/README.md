# DSH 皮肤转换器（dsh-skin-import）

带 Skill 的 MCode 插件：把 DeepSeek Harness（DSH）的皮肤类插件静态转换成 MCode 外观插件。用户在 MCode 里说“把 DSH 插件 xxx 转成 MCode 主题”，Agent 按 `skills/dsh-skin-import/SKILL.md` 下载、转换、讲拆解报告、问许可和是否安装，同意后装进本地插件目录并打开插件详情页，由用户自己点「应用」「用作壁纸」「用作开机画面」。

## 安全边界

- 只读源插件：`npm pack --ignore-scripts` 或 `git clone --depth 1` 下载到临时目录，不 `npm install`，不 `require` / `import` 它的文件，不执行它的代码。JS 里的主题数据用静态字面量解析读取。
- 脚本只用 Node 自带模块，没有第三方依赖。
- Agent 不替用户应用外观，只安装插件和打开 `minimax://plugin/details?name=<插件名>`。

## 能识别的格式

| 格式 | 例子 | 转成 |
|---|---|---|
| `ctx.theme.register` 字面量（`{ id, colorScheme, tokens }`） | dream-skin 内置皮肤、catppuccin 风味 | 单模式主题；`glow` 渐变取颜色作背景光晕 |
| dream-skin 主题包 `dsh-dream-skin/pack` | 导出的 JSON | 单模式主题 |
| skin-center 清单 v2 | `skin.json` + `skin.css` + `backgroundMedia` | 主题 + 壁纸 |
| 带 palette 属性的 CSS 变量块 | claude-style 的配色卡片 | 每张卡片一套亮暗主题 |
| opencode `theme.json` | opencode-palette 内嵌主题 | 主题（defs 与 dark/light 都解析） |
| `PALETTE` 色板字面量（OKLCH） | bloom 的 15 套色板 | 亮暗主题 |
| 字体文件、`@font-face` 内联 data URI | claude-style、opencode-palette | `fonts`（带 `files`） |
| 开机视频、背景图片 / 视频 | video-skin | 标准开机页、`wallpapers` |

颜色值里的 `var()`、`color-mix()`、`oklch()`、`oklab()`、`hsl()`、`rgba()`、`calc()` 按 DSH 默认色阶（`scripts/lib/dsh-defaults.json`）求值成 `#rrggbbaa`；DSH `--dsw-*` 到 MCode token 的对应表在 `scripts/lib/mapping.mjs`，缺的 token 由 `scripts/lib/derive.mjs` 按规则推算，并保证正文对比度 ≥ 4.5:1。

已知不支持、只出报告的：dsh-wallpaper-engine（宿主侧 Node 与本机 Wallpaper Engine）、dsh-liang-skin（推理滑块联动立绘）、beautiCode（背景管理器与 agent 工具）。

## 许可检查

- 字体：同目录有 OFL / Apache 等字体许可文件，或包内文字在字体名附近写明这类许可，才默认打包。
- 图片、视频：代码许可不覆盖素材。包里明确写了 CC0 / CC BY 等许可才默认打包；写了非商业（NC）或未授权的标为“许可受限”，什么都没写的标为“许可未确认”，都默认不打包，用户确认后用 `--allow <id>` 打包。
- opencode-palette 里以第三方 IP 命名的主题胶囊默认不收录（`--include-capsules` 收录）。

## 命令

```sh
node scripts/dsh-import.mjs <npm 包名 | git 地址 | 本地目录> --out <输出目录> [--allow id1,id2|all] [--include-capsules] [--name 插件名] [--json]
node scripts/install.mjs <输出目录>/<插件名> --data-dir <MCode 数据目录> [--replace]
node scripts/open-details.mjs <插件名>
node --test test/*.test.mjs
```

输出目录里有生成的插件目录（内含 `CONVERSION.md`：来源与版本、对应关系、颜色调整、丢失项、许可）和 `report.json`。

## 测试样例

`test/fixtures/` 都是手写的最小样例，只模仿 DSH 插件的结构，不含任何 DSH 插件的源码、画作或商标素材，字体和视频是占位字节。
