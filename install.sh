#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
copy_zshrc=false

usage() {
  echo "Usage: $0 [--zshrc]"
  echo ""
  echo "  Stow dotfiles from repo root into \$HOME."
  echo "  --zshrc  Also copy .zshrc (not stowed; copied to \$HOME/.zshrc)"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
  --zshrc)
    copy_zshrc=true
    shift
    ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    echo "Unknown option: $1"
    usage
    exit 1
    ;;
  esac
done

if ! command -v stow >/dev/null 2>&1; then
  echo "GNU Stow is required. Install it with 'brew install stow', 'sudo apt install stow', or your distro package manager."
  exit 1
fi

(
  cd "$repo_dir"
  stow -t "$HOME" .
)

if $copy_zshrc; then
  echo "Copying: $repo_dir/.zshrc -> $HOME/.zshrc"
  cp "$repo_dir/.zshrc" "$HOME/.zshrc"
fi
