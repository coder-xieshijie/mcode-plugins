# NOTICE

本仓库代码按 MIT 授权（见 `LICENSE`）。素材与第三方数据按各自来源授权，列在下面。

## 预设主题的色板来源（plugins/preset-themes）

主题颜色按各项目公开发布的色板写成，部分文字色为满足对比度做了微调（见 `plugins/preset-themes/README.md`）。主题名称只用于说明配色出处，归各项目所有；本仓库与这些项目没有隶属或背书关系。

| 主题 | 来源 | 许可 |
|---|---|---|
| Catppuccin（Latte / Mocha） | https://github.com/catppuccin/catppuccin | MIT |
| Dracula | https://github.com/dracula/dracula-theme | MIT |
| Nord | https://github.com/nordtheme/nord | MIT |
| Solarized | https://github.com/altercation/solarized | MIT |
| GitHub（Primer） | https://github.com/primer/primitives | MIT |
| One（One Light / One Dark） | https://github.com/atom/atom（one-light-syntax / one-dark-syntax） | MIT |
| Tokyo Night（Day / Night） | https://github.com/folke/tokyonight.nvim | Apache-2.0 |
| Gruvbox | https://github.com/morhetz/gruvbox | MIT |
| Rosé Pine（Dawn / Main） | https://github.com/rose-pine/rose-pine-theme | MIT |

## 章鱼少女素材（plugins/octopus-boot）

开机视频、关键帧和壁纸来自本仓库 `octopus-girl/` 的“MCode 章鱼少女”角色素材，按 CC BY 4.0 授权，署名“MCode 章鱼少女 by coder-xieshijie”；改动与例外见 `plugins/octopus-boot/LICENSE-ARTWORK.md`。“MiniMax”“MCode”名称与 MCode 章鱼图标不在许可内。本项目是个人非官方作品。

## DSH 默认色阶（plugins/dsh-plugin-convert）

`plugins/dsh-plugin-convert/scripts/lib/dsh-defaults.json` 是从 DeepSeek Harness 的 `packages/client/ui-theme/src/styles`（design-platform.css、shiki.css、base.css）提取的默认变量值，用于求值 DSH 皮肤里的 `var()` 引用。DeepSeek Harness 按 MIT 授权，Copyright (c) 2026 DeepSeek。

转换器生成的插件只包含用户自己选择转换的 DSH 插件内容，许可随源插件，转换器会把源插件的许可文本放进生成插件的 `LICENSES/`。
