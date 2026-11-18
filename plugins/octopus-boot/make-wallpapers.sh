#!/bin/sh
# 重新生成 package/wallpapers/ 下的 3 张壁纸：从 16:9 关键帧居中裁成 16:10，缩到 1920x1200，webp。
# 依赖 cwebp（libwebp）。产物已入库，只有换素材时才需要重跑。
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE"
for pair in "01-circuit:circuit" "02-code-wake:code-wake" "04-smile:smile"; do
  src=${pair%%:*}
  dst=${pair##*:}
  cwebp -quiet -q 76 -m 6 -crop 131 0 2458 1536 -resize 1920 1200 "assets/keyframes/$src.jpg" -o "package/wallpapers/$dst.webp"
done
ls -l package/wallpapers
