// Human-readable breakdown shown in the conversation: what converts, what is lost, licences.
export function renderReport(r) {
  const out = [];
  const src = r.source ? `${r.source.name} ${r.source.version}（代码许可 ${r.source.license ?? '未声明'}）` : '';
  if (r.unsupported) {
    out.push(`## ${src}：不支持转换`, '', r.unsupported);
    return out.join('\n');
  }
  out.push(`## ${src}`, '');
  out.push(`识别出的格式：${r.formats.join('、') || '无'}`, '');
  if (r.coverage) {
    out.push('### 对外观扩展点逐项对照', '', '| 扩展点 | 产出 | 源 | 说明 |', '|---|---|---|---|');
    for (const row of r.coverage) out.push(`| ${row.host} | ${row.result} | ${row.source} | ${row.note} |`);
    out.push('');
  }
  if (r.empty) {
    out.push('没有可以打包的内容（素材都在等待许可确认，或被包体积上限排除）。');
  } else {
    out.push(`### 能转的（已生成到 ${r.dir}）`, '');
    if (r.themes.length) out.push(`- 主题 ${r.themes.length} 套：${r.themes.map((t) => `${t.label}（${t.modes.map((m) => (m === 'dark' ? '暗' : '亮')).join('/')}）`).join('、')}；直接对应的颜色平均 ${Math.round(r.themes.reduce((s, t) => s + t.mapped, 0) / r.themes.length)} 个，其余按规则推算，为对比度调整 ${r.adjustments} 处`);
    if (r.fonts.length) out.push(`- 字体 ${r.fonts.length} 款：${r.fonts.map((f) => `${f.family}（${f.license}）`).join('、')}`);
    if (r.wallpapers.length) out.push(`- 壁纸 ${r.wallpapers.length} 张：${r.wallpapers.map((w) => w.id).join('、')}`);
    if (r.boot) out.push(`- 开机动画：${r.boot.file}（标准开机页，片尾溶解进界面）`);
    if (r.pet) out.push(`- 桌宠：${r.pet.kind === 'pack' ? `角色包 ${r.pet.name}（${r.pet.file}），${r.pet.animations} 组动作 / ${r.pet.frames} 帧，跟着会话状态切换：${r.pet.roles.join('、')}` : `${r.pet.file}（${r.pet.kind === 'video' ? '循环视频' : '静态立绘'}）`}；点一下看会话状态，双击开主窗口，右键有菜单`);
    out.push('');
  }
  out.push('### 丢掉的', '');
  out.push(...(r.lost.length ? r.lost.map((x) => '- ' + x) : ['- 无']), '');
  if (r.pending.length) {
    out.push('### 等你确认许可的素材（默认不打包）', '');
    for (const x of r.pending) out.push(`- ${x.kind} \`${x.id}\`（${x.name}）：${x.status === 'restricted' ? '许可受限' : '许可未确认'}——${x.reason}`);
    out.push('', '确认可以使用后，加 `--allow ' + r.pending.map((x) => x.id).join(',') + '` 重新转换。', '');
  }
  if (r.excluded.length || r.skipped.length) {
    out.push('### 其他没收录的', '');
    for (const x of [...r.excluded, ...r.skipped]) out.push(`- ${x.kind} ${x.id}：${x.reason}`);
    out.push('');
  }
  if (r.errors) out.push(r.errors.length ? '自检失败：\n' + r.errors.map((e) => '- ' + e).join('\n') : '自检通过（插件包限制与外观声明规则）。');
  return out.join('\n');
}
