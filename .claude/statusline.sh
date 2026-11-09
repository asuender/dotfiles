#!/usr/bin/env bash

dim=$'\033[2m'
yellow=$'\033[33m'
red=$'\033[31m'
reset=$'\033[0m'
rainbow=$'\033[38;5;196mf\033[38;5;178ma\033[38;5;34ms\033[38;5;33mt\033[0m'
sep="${dim} · ${reset}"

# Fields are joined with a non-whitespace separator so `read` keeps empty ones.
IFS=$'\x1f' read -r model effort fast dir ctx ctx_used ctx_size cache five_hour seven_day < <(
  jq -r '
    def pct: if type == "number" then round else "" end;
    def ratio_pct:
      if type == "number" then (. * 1000 | round) as $n | "\($n / 10 | floor).\($n % 10)"
      else "" end;
    def tokens:
      if type != "number" then ""
      elif . >= 999500 then "\(. / 100000 | round / 10)M"
      elif . >= 1000 then "\(. / 1000 | round)k"
      else tostring end;
    [
      .model.display_name,
      .effort.level,
      .fast_mode,
      .workspace.current_dir,
      (.context_window.used_percentage | pct),
      (.context_window.total_input_tokens | tokens),
      (.context_window.context_window_size | tokens),
      (.prompt_cache.hit_ratio | ratio_pct),
      (.rate_limits.five_hour.used_percentage | pct),
      (.rate_limits.seven_day.used_percentage | pct)
    ] | map(. // "" | tostring) | join("\u001f")
  '
)

usage() {
  local color=""
  if (($2 >= 90)); then
    color=$red
  elif (($2 >= 75)); then
    color=$yellow
  fi
  printf '%s%s %s%%%s' "$color" "$1" "$2" "$reset"
}

name=$model
[[ -n $effort ]] && name+=" ${dim}${effort}${reset}"
[[ $fast == true ]] && name+=" ${rainbow}"

folder=${dir##*/}
line="${folder:-/}${sep}${name}${sep}$(usage ctx "${ctx:-0}")"
[[ -n $ctx_used && -n $ctx_size ]] && line+=" ${dim}(${ctx_used}/${ctx_size})${reset}"
[[ -n $cache ]] && line+=" ${dim}ch ${cache}%${reset}"

limits=""
[[ -n $five_hour ]] && limits=$(usage 5h "$five_hour")
if [[ -n $seven_day ]]; then
  [[ -n $limits ]] && limits+="${dim}, ${reset}"
  limits+=$(usage 7d "$seven_day")
fi
[[ -n $limits ]] && line+="${sep}${dim}Claude${reset} ${limits}"

printf '%s\n' "$line"
