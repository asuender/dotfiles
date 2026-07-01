#!/usr/bin/env bash
set -euo pipefail

theme=${TMUX_THEME:-}

if [ -z "$theme" ]; then
  theme=dark

  if [ "$(uname -s)" = "Darwin" ]; then
    if defaults read -g AppleInterfaceStyle 2>/dev/null | grep -q Dark; then
      theme=dark
    else
      theme=light
    fi
  fi
fi

case "$theme" in
light)
  bg="#eff1f5"
  fg="#9ca0b0"
  fg_current="#4c4f69"
  fg_session="#1e66f5"
  fg_prefix="#fe640b"
  pane_border="#acb0be"
  pane_active="#8839ef"
  mode_bg="#1e66f5"
  message_fg="#fe640b"
  ;;
*)
  bg="#24273a"
  fg="#6e738d"
  fg_current="#cad3f5"
  fg_session="#8aadf4"
  fg_prefix="#f5a97f"
  pane_border="#5b6078"
  pane_active="#c6a0f6"
  mode_bg="#8aadf4"
  message_fg="#f5a97f"
  ;;
esac

tmux set -g @tmux-dotbar-bg "$bg"
tmux set -g @tmux-dotbar-fg "$fg"
tmux set -g @tmux-dotbar-fg-current "$fg_current"
tmux set -g @tmux-dotbar-fg-session "$fg_session"
tmux set -g @tmux-dotbar-fg-prefix "$fg_prefix"
tmux set -g @tmux-dotbar-position "top"
tmux set -g @tmux-dotbar-justify "left"
tmux set -g @tmux-dotbar-right "false"
tmux set -g @tmux-dotbar-bold-session "true"
tmux set -g @tmux-dotbar-bold-current-window "true"
tmux set -g @tmux-dotbar-session-text " #{=30:session_name} "
tmux set -g @tmux-dotbar-status-left-length 40
tmux set -g @tmux-dotbar-window-status-separator "•"
tmux set -g @tmux-dotbar-rounded true

tmux set -g pane-border-style "fg=$pane_border"
tmux set -g pane-active-border-style "fg=$pane_active"
tmux set -g message-style "bg=$bg,fg=$message_fg"
tmux set -g message-command-style "bg=$bg,fg=$message_fg"
tmux set -g mode-style "bg=$mode_bg,fg=$bg"
tmux setw -g clock-mode-colour "$mode_bg"

bash "$HOME/.config/tmux/plugins/tmux-dotbar/dotbar.tmux"
