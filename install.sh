#!/usr/bin/env bash

if [[ $# -eq 0 ]]; then
  echo "Usage: install.sh subset"
  exit 1
fi

subset=$1

if [[ ! $subset =~ ^(all|config|scripts)$ ]]; then
  echo "Invalid subset '$subset'. Exiting."
  exit 1
fi

if [ -z "$XDG_CONFIG_HOME" ]; then
  echo "\$XDG_CONFIG_HOME not set, using ~/.config"
  XDG_CONFIG_HOME=$HOME/.config
fi

copy() {
  echo "Copying: $1 to $2"
  cp "$1" "$2"
}

copy_dir() {
  echo "Deploying $1 to $2"
  mkdir -p "$2"
  cp -r "$1/." "$2/"
}

if [[ $subset =~ ^(all|config|scripts)$ ]]; then
  # Copy helper scripts
  mkdir -p "$HOME/.local/bin/helpers"
  mkdir -p "$HOME/.journal"
  copy "./.local/bin/helpers/tmux-quicky" "$HOME/.local/bin/helpers"
  copy "./.local/bin/helpers/tmux-clone" "$HOME/.local/bin/helpers"
  copy "./.local/bin/helpers/journal" "$HOME/.local/bin/helpers"
fi

if [[ $subset =~ ^(all|config)$ ]]; then
  if [[ $subset == "all" ]]; then
    copy "./.zshrc" "$HOME/.zshrc"
  fi

  # Deploy .config directories
  for dir in alacritty ghostty git opencode tms tmux zed nvim neovide; do
    if [ -d "./.config/$dir" ]; then
      copy_dir "./.config/$dir" "$XDG_CONFIG_HOME/$dir"
    fi
  done

  copy_dir "./.shell" "$HOME/.shell"
  copy_dir "./.templates" "$HOME/.templates"
  copy_dir "./.agents" "$HOME/.agents"
fi
