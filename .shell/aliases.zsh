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
alias c='chezmoi'
alias d='docker'
n() { if [ "$#" -eq 0 ]; then nvim .; else nvim "$@"; fi; }

# Docker shortcuts
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
alias dpa='docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
alias di='docker images'
alias dc='docker compose'
alias dcu='docker compose up -d'
alias dcd='docker compose down'
alias dcl='docker compose logs -f'

# Git shortcuts
alias g='git'
alias gs='git status --short --branch'
alias ga='git add'
alias gaa='git add --all'
alias gd='git diff'
alias gds='git diff --staged'
alias gl='git log --oneline --decorate --graph'
alias gb='git branch'
alias gco='git checkout'
alias gsw='git switch'
alias gcm='git commit -m'
alias gcam='git commit -a -m'
alias gcad='git commit -a --amend'
alias gp='git push'
alias gpl='git pull'
alias gf='git fetch --all --prune'

# Zsh config
alias zc="$EDITOR $HOME/.zshrc"
alias zs="source $HOME/.zshrc"

# Tmux
alias t="tmux new-session -A -s default"
alias ta="tmux a"

alias skills="npx skills"
