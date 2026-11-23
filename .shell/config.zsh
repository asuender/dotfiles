# Common configuration to be used across all machines using this setup

# Constants etc.
export TMS_CONFIG_FILE="$HOME/.config/tms/config.toml"

# Configuration starts here
export PATH=$HOME/.local/bin:$PATH
export VISUAL=nvim
export EDITOR="$VISUAL"

export HOMEBREW_NO_ENV_HINTS=1

# Empty value skips fzf's Ctrl-R binding; atuin owns it
FZF_CTRL_R_COMMAND= source <(fzf --zsh)

# Shell completions
eval "$(mise activate zsh)"
eval "$(uv generate-shell-completion zsh)"
eval "$(zoxide init zsh --cmd cd)"
eval "$(atuin init zsh)"

# Shell customizations (aliases, functions, envs)
for file in "$HOME/.shell"/*.zsh; do
  [[ -f "$file" && "$file" != "$HOME/.shell/config.zsh" ]] && source "$file"
done

