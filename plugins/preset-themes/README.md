# 预设主题合集（mcode-preset-themes）

9 套常见编辑器配色的 MCode 主题。只有颜色、圆角和代码字体名列表，不打包字体文件。

| 主题 | 模式 | 来源 |
|---|---|---|
| Catppuccin | 亮 Latte / 暗 Mocha | catppuccin/catppuccin（MIT） |
| Dracula | 暗 | dracula/dracula-theme（MIT） |
| Nord | 亮 Snow Storm / 暗 Polar Night | nordtheme/nord（MIT） |
| Solarized | Light / Dark | altercation/solarized（MIT） |
| GitHub | Light / Dark | primer/primitives（MIT） |
| One | One Light / One Dark | atom/atom（MIT） |
| Tokyo Night | Day / Night | folke/tokyonight.nvim（Apache-2.0） |
| Gruvbox | Light / Dark | morhetz/gruvbox（MIT） |
| Rosé Pine | Dawn / Main | rose-pine/rose-pine-theme（MIT） |

只有一种模式的主题（Dracula）应用时会锁定暗色，「设置 → 外观」里的明暗切换暂时不可用，换回其他主题后恢复。

## 怎么来的

- 色板写在仓库 `scripts/palettes.mjs`：每套给底色、侧栏、卡片、正文三档、强调色、边框和代码高亮颜色（都取自官方色板）。
- `node scripts/build-preset-themes.mjs` 用 `plugins/dsh-skin-import/scripts/lib/derive.mjs` 补全 MCode 的 47 个颜色 token、9 个代码 token 和背景光晕，生成 `appearance/appearance.json`，并打印为对比度做的每一处微调。
- `node scripts/check-contrast.mjs plugins/preset-themes/appearance/appearance.json` 检查：正文对所有底色 ≥ 4.5:1，次要文字和强调色文字对阅读面 ≥ 4.5:1，三级文字 ≥ 3:1，主按钮上的文字 ≥ 4.5:1，代码正文 ≥ 4.5:1。官方色板里对比度不够的文字色（如 Solarized Light 的正文、Tokyo Night Day 的正文）会按这个标准调深或调浅，色相不变。
- 图标由 `node scripts/build-preset-icon.mjs` 生成。

## 安装

把本目录复制到 MCode 数据目录的 `plugins/mcode-preset-themes/`，MCode 自动扫描并启用。在插件详情页的插件设置区点主题的「应用」，或在「设置 → 外观」的主题列表里选。安装本身不会切换主题。只带外观的插件需要支持插件外观的 MCode 版本。
