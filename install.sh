#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
copy_zshrc=false

usage() {
  echo "Usage: $0 [--zshrc]"
  echo ""
  echo "  Deploy dotfiles from the repo with mise."
  echo "  --zshrc  Also copy .zshrc to \$HOME/.zshrc"
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

if ! command -v mise >/dev/null 2>&1; then
  echo "mise is required: https://mise.jdx.dev/getting-started.html"
  exit 1
fi

(
  cd "$repo_dir"
  mise trust mise.toml
  mise dot apply
)

if $copy_zshrc; then
  echo "Copying: $repo_dir/.zshrc -> $HOME/.zshrc"
  cp "$repo_dir/.zshrc" "$HOME/.zshrc"
fi
