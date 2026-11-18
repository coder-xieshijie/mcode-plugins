---
name: dsh-skin-import
description: 把 DeepSeek Harness（DSH）的皮肤、主题、开机动画类插件转换成 MCode 外观插件（主题配色、字体、壁纸、开机画面），先给拆解报告和许可检查，再在用户同意后安装到本地插件目录并带用户去插件设置区。用户给出 DSH 插件的 npm 包名、GitHub 地址或本地目录并想在 MCode 里用它的外观时使用。
---

# DSH 皮肤转换

把一个 DSH 皮肤类插件转成 MCode 外观插件。全程只读源插件：不安装它的依赖，不执行、不 `require`/`import` 它的任何文件；转换由本 Skill 自带的 Node 脚本静态完成（只用 Node 自带模块）。

本文件所在目录记为 `SKILL_DIR`，脚本在 `SKILL_DIR/../../scripts/`。需要本机能运行 `node`（18 及以上）；运行 `node --version` 确认，没有就告诉用户先装 Node.js，不要改用别的方式执行源插件。

## 1. 确认输入

用户给的来源是下面三种之一，直接传给脚本：

- npm 包名（可带版本），如 `dsh-dream-skin`、`@scope/name@1.2.3`：脚本用 `npm pack --ignore-scripts` 下载到临时目录；
- GitHub 等 git 地址：脚本用 `git clone --depth 1`；
- 本地目录：直接读取。

来源不明确时只问这一项。

## 2. 转换并读报告

```sh
node "SKILL_DIR/../../scripts/dsh-import.mjs" <来源> --out <临时输出目录>
```

输出目录用系统临时目录下的新目录（如 macOS/Linux 的 `$TMPDIR/dsh-skin-import`，Windows 的 `%TEMP%\dsh-skin-import`），不要写进用户的项目。脚本打印拆解报告，并在输出目录写 `report.json` 和插件目录 `<输出目录>/<插件名>/`（内含 `CONVERSION.md`）。

脚本做的事（报告里会逐项写明）：

- 识别可静态解析的格式：`ctx.theme.register` 的字面量 token 表（如 dream-skin 内置皮肤、catppuccin 风味）、dream-skin 主题包、skin-center 清单 v2、带 palette 属性的 CSS 变量块（如 claude-style 的配色卡片）、opencode `theme.json`、PALETTE 色板字面量（如 bloom）。
- 把 `var()`、`color-mix()`、`oklch()`、`rgba()`、`calc()` 按 DSH 默认色阶求值成 `#rrggbbaa`，按映射表对应到 MCode 的 47 个颜色 token 和 9 个代码 token，缺的按规则推算，并把正文对比度调到 ≥ 4.5:1。
- 包内字体文件和内联字体转成 `fonts`；背景图片、视频转成 `wallpapers`；开机视频套标准开机页（进度条、就绪、片尾溶解进主界面、点击跳过）。
- 已知不支持的插件（如 dsh-wallpaper-engine、dsh-liang-skin、beautiCode 这类依赖宿主侧运行时或纯工具型的）只出报告说明原因，不生成插件。

## 3. 在对话里给出拆解报告

用自己的话把报告讲给用户，三块都要有：

1. **能转什么**：主题几套、各有哪些明暗模式（只有一种的应用时会锁定该模式）、字体、壁纸、开机动画。
2. **丢什么**：毛玻璃、DOM 改写、音效、状态色和 diff 色等 MCode 接不住的部分，原样转述报告。
3. **许可**：哪些素材默认没打包、为什么（非商业 NC、未授权、出处不明）。

报告里有“等你确认许可的素材”时，问用户是否确认这些素材可以使用（例如是自己的、或已取得授权）。只有用户明确同意某一项，才把它的 id 加到 `--allow` 重新转换：

```sh
node "SKILL_DIR/../../scripts/dsh-import.mjs" <来源> --out <同一输出目录> --allow id1,id2
```

用户没点头的素材保持不打包；不要替用户判断“应该没问题”。opencode-palette 的 IP 主题胶囊默认不收录，用户明确要时加 `--include-capsules`。

报告末尾“自检失败”时，不要安装，把失败项告诉用户。

## 4. 问是否安装并启用

问用户：“是否安装并启用这个外观插件？”用户同意后：

1. **确定 MCode 数据目录**：用当前会话环境信息里的 `activeDataDir`；当前会话里 `plugin-creator` Skill 渲染出的 `{{DATA_DIR}}` 路径与它相同，也可以用。两者都拿不到时问用户，不要猜 `~/.minimax`。
2. **安装**：

   ```sh
   node "SKILL_DIR/../../scripts/install.mjs" <输出目录>/<插件名> --data-dir <数据目录>
   ```

   插件会写进 `<数据目录>/plugins/<插件名>/`，MCode 自动扫描并默认启用，不需要重启。脚本退出码 3 表示同名插件已存在：问用户是否覆盖，同意后加 `--replace` 重跑。
3. **带用户去插件设置区**：

   ```sh
   node "SKILL_DIR/../../scripts/open-details.mjs" <插件名>
   ```

   它打开 `minimax://plugin/details?name=<插件名>`。告诉用户在插件详情页的插件设置区自己点：主题上的「应用」，字体上的「用作 UI 字体」「用作代码字体」，壁纸上的「用作壁纸」，开机动画的「用作开机画面」（下次启动生效）。

**Agent 不替用户应用外观**：不改外观设置，不写 MCode 的数据库或配置文件，只做安装和打开详情页。

## 5. 收尾

告诉用户：插件目录位置、`CONVERSION.md` 里有来源与版本、对应关系、丢失项和许可；以后不想用可以在插件详情页停用或卸载，外观会立即回到默认。
