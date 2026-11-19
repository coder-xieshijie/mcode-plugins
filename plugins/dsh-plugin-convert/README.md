# DSH 插件转换器（dsh-plugin-convert）

带 Skill 的 MCode 插件：把 DeepSeek Harness（DSH）的插件静态转换成 MCode 外观插件。判据是 MCode 暴露的外观扩展点，不是源插件叫什么：主题、字体、壁纸、开机画面、桌宠、插件设置六项，能对应上的都转，对不上的逐项写进报告。用户在 MCode 里说“把 DSH 插件 xxx 转成 MCode 主题”，Agent 按 `skills/dsh-plugin-convert/SKILL.md` 下载、转换、讲拆解报告、问许可和是否安装，同意后装进本地插件目录；插件带开机动画时用深链 `plugin/boot` 把它设为开机画面（下次启动生效，用户可在插件设置区关掉）；再告诉用户去插件详情页（插件管理 → 该插件 → 插件设置），由用户自己点「应用」「用作 UI 字体」「用作壁纸」。

## 安全边界

- 只读源插件：`npm pack --ignore-scripts` 或 `git clone --depth 1` 下载到临时目录，不 `npm install`，不 `require` / `import` 它的文件，不执行它的代码。JS 里的主题数据用静态字面量解析读取。
- 脚本只用 Node 自带模块，没有第三方依赖。
- Agent 不替用户应用主题、字体和壁纸，只安装插件；唯一的例外是安装后把带开机动画的插件设为开机画面（MCode 的 `plugin/boot` 深链，与插件设置区的「用作开机画面」开关同一行为）。
- 深链的协议名随 MCode 版本不同（`minimax`、`minimax-cn`，测试/预发加 `-test` / `-staging`）。MCode 把当前实例的协议名放在 Agent 命令的环境变量 `MCODE_APP_SCHEME` 里，脚本默认读它；没有时不打开，只给手动路径。系统只报告“有应用接收了链接”，所以脚本输出 `launched`，从不声称已打开或已生效。

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
| 立绘 / 角色素材（`pet`、`mascot`、`character`、`live2d`、`立绘` 等命名） | dream-skin 的角色图 | 标准桌宠页 `pages/pet`：点一下看会话状态、双击开主窗口、右键菜单、可拖动 |

颜色值里的 `var()`、`color-mix()`、`oklch()`、`oklab()`、`hsl()`、`rgba()`、`calc()` 按 DSH 默认色阶（`scripts/lib/dsh-defaults.json`）求值成 `#rrggbbaa`；DSH `--dsw-*` 到 MCode token 的对应表在 `scripts/lib/mapping.mjs`，缺的 token 由 `scripts/lib/derive.mjs` 按规则推算，并保证正文对比度 ≥ 4.5:1。

报告里有一张「对外观扩展点逐项对照」表，六项各占一行，写清产出、来源和说明，所以「这个插件能转什么」不用从报告里推断。

只有整包没有可搬内容时才整包拒绝：目前是 dsh-wallpaper-engine（宿主侧 Node 与本机 Wallpaper Engine，素材要实时渲染）。dsh-liang-skin（推理滑块联动）和 beautiCode（背景管理器与 agent 工具）改成逐项处理：能静态读取的配色、字体、立绘照转，依赖宿主运行时的部分写进「丢掉的」。

## 许可检查

- 字体：同目录有 OFL / Apache 等字体许可文件，或包内文字在字体名附近写明这类许可，才默认打包。
- 图片、视频：代码许可不覆盖素材。包里明确写了 CC0 / CC BY 等许可才默认打包；写了非商业（NC）或未授权的标为“许可受限”，什么都没写的标为“许可未确认”，都默认不打包，用户确认后用 `--allow <id>` 打包。
- opencode-palette 里以第三方 IP 命名的主题胶囊默认不收录（`--include-capsules` 收录）。

## 命令

```sh
node scripts/dsh-import.mjs <npm 包名 | git 地址 | 本地目录> --out <输出目录> [--allow id1,id2|all] [--include-capsules] [--name 插件名] [--json]
node scripts/install.mjs <输出目录>/<插件名> --data-dir <MCode 数据目录> [--replace]
node scripts/open-boot.mjs <已安装的插件目录> [--scheme <协议名>] [--open]   # 带开机动画时设为开机画面；输出 JSON
node scripts/open-details.mjs <插件名> [--scheme <协议名>] [--open]   # 输出 JSON：链接、是否交给系统、手动路径
node --test test/*.test.mjs
```

输出目录里有生成的插件目录（内含 `CONVERSION.md`：来源与版本、对应关系、颜色调整、丢失项、许可）和 `report.json`。

## 测试样例

`test/fixtures/` 都是手写的最小样例，只模仿 DSH 插件的结构，不含任何 DSH 插件的源码、画作或商标素材，字体和视频是占位字节。
