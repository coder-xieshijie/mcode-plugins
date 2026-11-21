# AGENTS.md — mcode-plugins

MCode 外观插件的开发仓，附“MCode 章鱼少女”的角色素材。现在是 GitHub 私有仓，以后计划公开：一切内容按公开标准写，不放公司内部信息（内部链接与主机名、测试账号、任务号、同事姓名）。

- 构建、安装和校验命令见 README；改完跑 `npm test`。
- 预设主题由 `scripts/palettes.mjs` 生成：改颜色改它，再运行 `node scripts/build-preset-themes.mjs`，不手改 `plugins/preset-themes/appearance/appearance.json`。
- 发到官方市场的是 `sh plugins/octopus-boot/build.sh` 的产物 `dist/mcode-octopus-boot/`，不是 `package/` 模板；先改本仓，再同步到市场仓。
- 许可分三层：代码 MIT，角色美术与提示词 CC BY 4.0，MCode / MiniMax 名称与图标不在许可内。新增第三方色板或素材时更新 `NOTICE.md`。
- 改 `octopus-girl/` 之前读 `octopus-girl/AGENTS.md`。
