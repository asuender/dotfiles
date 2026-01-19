#!/bin/bash
input=$(cat)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RESET='\033[0m'

model=$(echo "$input" | jq -r '.model.display_name')
current_dir=$(echo "$input" | jq -r '.workspace.current_dir')
cost=$(echo "$input" | jq -r '.cost.total_cost // empty')
context_perct=$(echo "$input" | jq -r '.context_window.used_percentage')

show_context_usage() {

  if [ "$context_perct" -lt 50 ]; then
    color=$GREEN
  elif [ "$context_perct" -lt 80 ]; then
    color=$YELLOW
  else
    color=$RED
  fi
  echo -e "${color}${context_perct}%${RESET}"
}

show_git_branch() {
  if git rev-parse --git-dir >/dev/null 2>&1; then
    branch=$(git branch --show-current 2>/dev/null)
    echo -e "${CYAN}${branch}${RESET}"
  fi
}

show_cost() {
  if [ -n "$cost" ] && [ "$cost" != "null" ]; then
    echo -e "${YELLOW}\$${cost}${RESET}"
  fi
}

dir_name=$(basename "$current_dir")
git_info=$(show_git_branch)
cost_info=$(show_cost)

output="${BLUE}${model}${RESET} | $(show_context_usage)"
[ -n "$git_info" ] && output="$output | $git_info"
[ -n "$cost_info" ] && output="$output | $cost_info"
output="$output | ${dir_name}"

echo -e "$output"
