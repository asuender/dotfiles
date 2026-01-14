# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH

# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time Oh My Zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="robbyrussell"

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment one of the following lines to change the auto-update behavior
# zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time

# Uncomment the following line to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# You can also set it to another string to have that shown instead of the default red dots.
# e.g. COMPLETION_WAITING_DOTS="%F{yellow}waiting...%f"
# Caution: this setting can cause issues with multiline prompts in zsh < 5.7.1 (see #5765)
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(
  git
  zsh-autosuggestions
  zsh-syntax-highlighting
)

[[ -f "$ZSH/oh-my-zsh.sh" ]] && source "$ZSH/oh-my-zsh.sh"

# Set personal aliases, overriding those provided by Oh My Zsh libs,
# plugins, and themes. Aliases can be placed here, though Oh My Zsh
# users are encouraged to define aliases within a top-level file in
# the $ZSH_CUSTOM folder, with .zsh extension. Examples:
# - $ZSH_CUSTOM/aliases.zsh
# - $ZSH_CUSTOM/macos.zsh
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"

# Basic stuff

export VISUAL=nvim
export EDITOR="$VISUAL"

alias zshc="$EDITOR $HOME/.zshrc"
alias zshs="source $HOME/.zshrc"

alias tm="tmux new-session -A -s default"
alias tma="tmux a"
alias clear='clear && [ -n "$TMUX" ] && tmux clear-history'

export PATH=$HOME/.local/bin:$PATH
[[ -f "$HOME/.cargo/env" ]] && . "$HOME/.cargo/env"
[[ -d "$HOME/.cargo/bin" && ":$PATH:" != *":$HOME/.cargo/bin:"* ]] && export PATH="$HOME/.cargo/bin:$PATH"

# Omarchy defaults (aliases, functions, envs)
if [[ -d "$HOME/.local/share/omarchy/default/bash" ]]; then
  source "$HOME/.local/share/omarchy/default/bash/aliases"
  source "$HOME/.local/share/omarchy/default/bash/functions"
  source "$HOME/.local/share/omarchy/default/bash/envs"
fi

[[ -d "/opt/homebrew/opt/python@3.12/libexec/bin" ]] &&
  export PATH="/opt/homebrew/opt/python@3.12/libexec/bin:$PATH"

# pnpm: check macOS and Linux paths
if [[ -d "$HOME/Library/pnpm" ]]; then
  export PNPM_HOME="$HOME/Library/pnpm"
elif [[ -d "$HOME/.local/share/pnpm" ]]; then
  export PNPM_HOME="$HOME/.local/share/pnpm"
fi
[[ -n "$PNPM_HOME" && ":$PATH:" != *":$PNPM_HOME:"* ]] && export PATH="$PNPM_HOME:$PATH"

# Shell completions

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"                   # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" # This loads nvm bash_completion

if [[ -d "$HOME/.fzf/bin" && ! "$PATH" == *$HOME/.fzf/bin* ]]; then
  export PATH="$PATH:$HOME/.fzf/bin"
fi

source <(fzf --zsh)
eval "$(uv generate-shell-completion zsh)"
eval "$(zoxide init zsh)"

export TMS_CONFIG_FILE="$HOME/.config/tms/config.toml"

# Custom keybindings

FC_SEARCH_DIRS=("$HOME/coding" "$HOME/mermec" "$HOME/.config" "$HOME/.claude")

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
