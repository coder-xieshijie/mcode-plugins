#!/bin/sh
# 打包章鱼开机插件：把 package/ 复制成一份可发布副本，可选地按关键帧刷新封面与尾帧。
# package/ 本身就是完整可安装的插件目录，直接复制即可安装；本脚本只用于生成发布副本。
# 用法：sh plugins/octopus-boot/build.sh [输出目录]，默认 plugins/octopus-boot/dist
# 刷新静帧需要 macOS 自带的 sips，或用 ffmpeg；都没有时沿用包内已有的 poster.jpg / end.jpg。
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=${1:-"$HERE/dist"}
PKG="$OUT/mcode-octopus-boot"
rm -rf "$PKG"
mkdir -p "$PKG"
cp -R "$HERE/package/." "$PKG/"
MEDIA="$PKG/pages/boot/media"
# 封面用首帧、减少动态效果时用尾帧；缩到 1920 宽，先于视频画出来
still() {
  if command -v sips >/dev/null 2>&1; then
    sips -Z 1920 -s format jpeg -s formatOptions 80 "$1" --out "$2" >/dev/null
  elif command -v ffmpeg >/dev/null 2>&1; then
    ffmpeg -loglevel error -y -i "$1" -vf "scale=1920:-2" -q:v 4 "$2"
  fi
}
still "$HERE/assets/keyframes/01-circuit.jpg" "$MEDIA/poster.jpg"
still "$HERE/assets/keyframes/04-smile.jpg" "$MEDIA/end.jpg"
echo "$PKG"
