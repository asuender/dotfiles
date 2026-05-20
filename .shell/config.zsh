# Common configuration to be used across all machines
# using this setup

# Constants etc.

FC_SEARCH_DIRS=("$HOME/coding" "$HOME/mermec" "$HOME/.config" "$HOME/.claude")
export TMS_CONFIG_FILE="$HOME/.config/tms/config.toml"

# Confiuration starts here

export VISUAL=nvim
export EDITOR="$VISUAL"
export PATH=$HOME/.local/bin:$PATH

export HOMEBREW_NO_ENV_HINTS=1

# Shell customizations (aliases, functions, envs)
for file in "$HOME/.shell"/*.zsh; do
  [[ -f "$file" && "$file" != "$HOME/.shell/config.zsh" ]] && source "$file"
done

# Shell completions

export PATH="$PATH:$HOME/.fzf/bin"
source <(fzf --zsh)

eval "$(uv generate-shell-completion zsh)"
eval "$(zoxide init zsh)"

# Folder changer

fc_find_dirs() {
  for path in "${FC_SEARCH_DIRS[@]}"; do
    if [[ -d "$path" ]]; then
      "$FC_FD_CMD" --type d . "$path"
      echo "$path"
    fi
  done
}

_folder_changer() {
  local dir=$(fc_find_dirs | fzf)
  if [ -n "$dir" ]; then
    zle push-input
    cd "$dir" || return
    zle accept-line
  fi
}

zle -N _folder_changer

# This will actually not interfere with tmux,
# so I will keep it there for convenience
bindkey "^f" _folder_changer
bindkey "^g" _folder_changer

# Resolve fd path for folder changer
FC_FD_CMD="$(command -v fd 2>/dev/null || echo fd)"
