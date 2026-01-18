# File system - eza-based listings
if command -v eza &> /dev/null; then
  alias ls='eza -lh --group-directories-first --icons=auto'
  alias lsa='ls -a'
  alias lt='eza --tree --level=2 --long --icons --git'
  alias lta='lt -a'
fi

# fzf with bat preview
alias ff="fzf --preview 'bat --style=numbers --color=always {}'"

# zoxide-enhanced cd
if command -v zoxide &> /dev/null; then
  alias cd="zd"
  zd() {
    if [ $# -eq 0 ]; then
      builtin cd ~ && return
    elif [ -d "$1" ]; then
      builtin cd "$1"
    else
      z "$@" && printf "\U000F17A9 " && pwd || echo "Error: Directory not found"
    fi
  }
fi

# xdg-open wrapper (Linux)
if command -v xdg-open &> /dev/null; then
  open() {
    xdg-open "$@" >/dev/null 2>&1 &
  }
fi

# Directory navigation
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'

# Tool shortcuts
alias c='opencode'
alias d='docker'
alias r='rails'
n() { if [ "$#" -eq 0 ]; then nvim .; else nvim "$@"; fi; }

# Git shortcuts
alias g='git'
alias gcm='git commit -m'
alias gcam='git commit -a -m'
alias gcad='git commit -a --amend'

# Zsh config
alias zshc="$EDITOR $HOME/.zshrc"
alias zshs="source $HOME/.zshrc"

# Tmux
alias tm="tmux new-session -A -s default"
alias tma="tmux a"
