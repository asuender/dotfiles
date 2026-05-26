#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 {all|home|zshrc}"
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

stow_home() {
  require_stow
  (
    cd "$repo_dir"
    stow -t "$HOME" home
  )
}

copy_zshrc() {
  echo "Copying: $repo_dir/.zshrc to $HOME/.zshrc"
  cp "$repo_dir/.zshrc" "$HOME/.zshrc"
}

case "$subset" in
all)
  stow_home
  copy_zshrc
  ;;
home)
  stow_home
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
