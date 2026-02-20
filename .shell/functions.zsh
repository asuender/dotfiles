# Compression utilities
compress() { tar -czf "${1%/}.tar.gz" "${1%/}"; }
alias decompress="tar -xzf"

# Create a tmux layout for dev with editor, ai, and terminal
# adapted from omarchy
tml() {
  local current_dir="${PWD}"
  local editor_pane ai_pane
  local ai="$1"

  # Skip if layout was already created
  local pane_count=$(tmux display-message -p '#{window_panes}')
  if [[ "$pane_count" -gt 1 ]]; then
    return
  fi

  # Get current pane ID (will become editor pane after splits)
  editor_pane=$(tmux display-message -p '#{pane_id}')

  # Split horizontally - AI pane on the right (30% width, full height)
  tmux split-window -h -p 30 -c "$current_dir"
  ai_pane=$(tmux display-message -p '#{pane_id}')
  tmux send-keys -t "$ai_pane" "$ai" C-m

  # Split the left pane vertically - terminal at the bottom (15% height)
  tmux select-pane -t "$editor_pane"
  tmux split-window -v -p 15 -c "$current_dir"

  # Run nvim in the top-left pane
  tmux send-keys -t "$editor_pane" "$EDITOR ." C-m

  # Select the nvim pane for focus
  tmux select-pane -t "$editor_pane"
}
