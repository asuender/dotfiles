#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 {personal|vps|common|zshrc}"
  echo ""
  echo "  personal  Stow common + personal packages and copy .zshrc"
  echo "  vps       Stow common + vps packages"
  echo "  common    Stow common package only"
  echo "  zshrc     Copy .zshrc only"
}

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

subset=$1
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

require_stow() {
  if ! command -v stow >/dev/null 2>&1; then
    echo "GNU Stow is required. Install it with 'brew install stow', 'sudo apt install stow', or your distro package manager."
    exit 1
  fi
}

stow_package() {
  if [ -z "$1" ]; then
    echo "Error: no package name supplied"
  fi

  require_stow
  (
    cd "$repo_dir"
    stow -t "$HOME" $1
  )
}

copy_zshrc() {
  echo "Copying: $repo_dir/.zshrc to $HOME/.zshrc"
  cp "$repo_dir/.zshrc" "$HOME/.zshrc"
}

case "$subset" in
personal)
  stow_package common
  stow_package personal
  copy_zshrc
  ;;
vps)
  stow_package common
  stow_package vps
  ;;
common)
  stow_package common
  ;;
zshrc)
  copy_zshrc
  ;;
*)
  echo "Invalid subset '$subset'."
  usage
  exit 1
  ;;
esac
