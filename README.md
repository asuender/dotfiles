# config

Personal dotfiles deployed with mise. Config lives at the repo root (`.config/`, `.shell/`, etc.) and is linked into `$HOME` by `mise.toml`.

## Hammerspoon - Whisper Dictation

A lightweight push-to-talk voice dictation Spoon lives in `.hammerspoon/Spoons/Whisper.spoon/`. Hold **Caps Lock** (remapped to Control in System Settings) to record from the microphone, release to send the audio to a remote [mlx-audio](https://github.com/Blaizzy/mlx-audio) STT server for transcription, and the result is pasted into whatever app has focus.

**Requirements:**
- [Hammerspoon](https://www.hammerspoon.org/) (`brew install --cask hammerspoon`)
- `ffmpeg` on the local machine (`brew install ffmpeg`)
- An mlx-audio server running on the LAN (e.g. `mlx_audio.server --host 0.0.0.0 --port 8000`)
- Caps Lock remapped to Control in System Settings -> Keyboard -> Keyboard Shortcuts -> Modifier Keys
- Hammerspoon granted Accessibility and Microphone permissions

The server URL, model path, and other settings are configured at the top of `.hammerspoon/Spoons/Whisper.spoon/init.lua`.

## Install

[Install mise](https://mise.jdx.dev/getting-started.html), then run from the repo root:

```sh
mise trust mise.toml
mise dot apply --dry-run  # Preview changes
mise dot apply
mise dot status
```

`.zshrc` is an optional starting point, not a mise-managed file. To use it on a
new machine, copy it once and then customize the copy locally:

```sh
cp .zshrc ~/.zshrc
```

This overwrites an existing `~/.zshrc`, so back it up first if needed. To check
deployment later, run `mise dot status` here (or use
`mise -C /path/to/dotfiles dot status` from another directory).

mise will not overwrite existing real files when linking. Back up any
conflicting files before applying; avoid `--force` unless you have reviewed
what it would replace. Generated dependencies in
`.pi/agent/extensions/node_modules` are excluded from deployment.

On a VPS, also add the tmux overrides below.

## Dotfiles quick reference

Run these commands from the repo root. Entries in `mise.toml` use `symlink-each`:
edit source files in the repo (or through their links in `$HOME`), then apply to
sync links. Unmanaged files in the target directories are left alone.

| Task | Command |
| --- | --- |
| Preview changes | `mise dot apply --dry-run` |
| Inspect differences | `mise dot diff` |
| Deploy or repair links | `mise dot apply` |
| Check for missing or changed targets | `mise dot status` |
| Adopt an existing file into this repo | `mise dot add --local ~/.example` |
| Stop managing a target | `mise dot unapply ~/.example` |

Unapply a target **before** removing its entry from `mise.toml`; unapply removes
the deployed link, not its source or config entry. `mise dot add` without
`--local` writes to the global mise config by default. Preview before using
`mise dot apply --force`, which can replace conflicting real files.

See the [mise managed-files guide](https://mise.jdx.dev/dotfiles/managed.html)
for other modes and options.

## Agent skills

`~/.agents` is linked as a whole directory, so global skills installed with the
[skills CLI](https://github.com/vercel-labs/skills) land directly in this repo.
Install for both the generic `~/.agents/skills/` format (`universal`) and Claude
Code in one command, so the tracked copy, `.skill-lock.json`, and Claude's copy
stay on the same version:

```sh
skills add <source> -g -a universal -a claude-code -s <skill> -y
```

`~/.claude/skills/` holds untracked copies, not symlinks. Installing for
`claude-code` alone updates `.agents/.skill-lock.json` without updating the
tracked skill files.

## VPS overrides

On remote machines, create `~/.config/tmux/tmux.local.conf` for OSC 52 clipboard passthrough and proper terminal colors over SSH:

```tmux
# OSC 52 clipboard passthrough for remote terminals
set-option -as terminal-overrides ",xterm*:Ms=\\E]52;c%p1%.0s;%p2%s\\7"
set-option -as terminal-overrides ",tmux*:Ms=\\E]52;c%p1%.0s;%p2%s\\7"

set -as terminal-features ",xterm-*:RGB"
set -as terminal-features ",tmux-*:RGB"
set -as terminal-features ",ghostty:RGB"
```

The main tmux config already sources this file if present (`source-file -q` in `.config/tmux/tmux.conf`).

## Testing with Docker

```sh
docker run -it -v $HOME/.config:/root/.config buildpack-deps
```
