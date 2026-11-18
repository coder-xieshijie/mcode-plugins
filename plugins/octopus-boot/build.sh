#!/bin/sh
# 组装章鱼开机插件安装包：复制 package/，再从 assets/ 放入开机视频、封面和尾帧。
# 用法：sh plugins/octopus-boot/build.sh [输出目录]，默认 plugins/octopus-boot/dist
# 依赖：macOS 自带的 sips；没有 sips 时用 ffmpeg。
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=${1:-"$HERE/dist"}
PKG="$OUT/mcode-octopus-boot"
rm -rf "$PKG"
mkdir -p "$PKG"
cp -R "$HERE/package/." "$PKG/"
MEDIA="$PKG/pages/boot/media"
mkdir -p "$MEDIA"
cp "$HERE/assets/boot.mp4" "$MEDIA/boot.mp4"
# 封面用首帧、减少动态效果时用尾帧；缩到 1920 宽，先于视频画出来
still() {
  if command -v sips >/dev/null 2>&1; then
    sips -Z 1920 -s format jpeg -s formatOptions 80 "$1" --out "$2" >/dev/null
  else
    ffmpeg -loglevel error -y -i "$1" -vf "scale=1920:-2" -q:v 4 "$2"
  fi
}
still "$HERE/assets/keyframes/01-circuit.jpg" "$MEDIA/poster.jpg"
still "$HERE/assets/keyframes/04-smile.jpg" "$MEDIA/end.jpg"
echo "$PKG"
