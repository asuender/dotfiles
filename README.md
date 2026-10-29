# config

Personal dotfiles, deployed with [mise](https://mise.jdx.dev/). The config lives
at the repo root (`.config/`, `.shell/`, and so on), and `mise.toml` maps it
into `$HOME`.

## Install

[Install mise](https://mise.jdx.dev/getting-started.html), then run from the
repo root:

```sh
mise trust mise.toml
mise dot apply --dry-run  # Preview changes
mise dot apply
mise dot status
```

mise does not overwrite existing real files when linking. Back up any file that
conflicts before applying, and avoid `--force` until you have reviewed what it
would replace. Generated dependencies in `.pi/agent/extensions/node_modules` are
excluded from deployment.

`.zshrc` is not managed by mise. It is a starting point: copy it once on a new
machine and customize the copy locally. This overwrites an existing `~/.zshrc`,
so back that up first if you need it.

```sh
cp .zshrc ~/.zshrc
```

On a VPS, also add the [tmux overrides](#vps-overrides).

## Dotfiles quick reference

Run these commands from the repo root, or pass the repo path from elsewhere,
for example `mise -C /path/to/dotfiles dot status`.

| Task | Command |
| --- | --- |
| Preview changes | `mise dot apply --dry-run` |
| Inspect differences | `mise dot diff` |
| Deploy or repair links | `mise dot apply` |
| Check for missing or changed targets | `mise dot status` |
| Adopt an existing file into this repo | `mise dot add --local ~/.example` |
| Stop managing a target | `mise dot unapply ~/.example` |

Most entries in `mise.toml` use `symlink-each`, which links each file in the
repo individually and leaves unmanaged files in the target directory alone.
Edit the source files in the repo or through their links in `$HOME`, then apply
to sync the links. New files created under `$HOME` are not imported
automatically; adopt them with `mise dot add --local`. Without `--local`,
`mise dot add` writes to the global mise config.

`~/.agents` is the exception. It uses `symlink` and points to `.agents/` as a
whole, so anything written there lands in the repo directly.

Before switching a directory from `symlink-each` to `symlink`, compare the live
directory with the repo and move any live-only files into the repo. Then preview
with `mise dot apply --dry-run` before applying.

To stop managing a target, run `mise dot unapply` **before** removing its entry
from `mise.toml`. Unapply removes the deployed link but leaves the source file
and the config entry in place.

The [mise managed-files guide](https://mise.jdx.dev/dotfiles/managed.html)
covers the other modes and options.

## Agent skills

Because `~/.agents` is linked as a whole, global skills installed with the
[skills CLI](https://github.com/vercel-labs/skills) land directly in this repo.
Install them for the generic `~/.agents/skills/` format (`universal`) only, then
link them into Claude Code:

```sh
skills add <source> -g -a universal -s <skill> -y
mise run link-claude-skills
```

`~/.claude/skills/` is an untracked directory of per-skill symlinks
(`<name> -> ../../.agents/skills/<name>`). It is not linked as a whole because
Claude Code stores its own `synced/` skills there, and those would leak into
agents that scan `~/.agents/skills` recursively.

`link-claude-skills` is a global task defined in `.config/mise/config.toml`, so
it runs from any directory. It links every skill missing from
`~/.claude/skills/`, including custom ones, and removes links to deleted skills.
Run it after adding or removing a skill and on a fresh machine. Updating a skill
does not require a rerun.

## Pi extensions

Pi extensions live in `.pi/agent/extensions/`. Most are self-contained
TypeScript files; larger ones have their own sub-folder. If an extension has a
`README.md`, read it before changing the extension.

## Hammerspoon - Whisper Dictation

`.hammerspoon/Spoons/Whisper.spoon/` is a push-to-talk dictation Spoon. Hold
**Caps Lock** to record from the microphone. On release, the audio goes to a
remote [mlx-audio](https://github.com/Blaizzy/mlx-audio) speech-to-text server,
and the transcription is pasted into the app that has focus.

Requirements:

- [Hammerspoon](https://www.hammerspoon.org/) (`brew install --cask hammerspoon`)
- `ffmpeg` on the local machine (`brew install ffmpeg`)
- An mlx-audio server on the LAN, for example
  `mlx_audio.server --host 0.0.0.0 --port 8000`
- Caps Lock remapped to Control in System Settings -> Keyboard -> Keyboard
  Shortcuts -> Modifier Keys
- Accessibility and Microphone permissions for Hammerspoon

The server URL, model path, and other settings are at the top of
`.hammerspoon/Spoons/Whisper.spoon/init.lua`.

## VPS overrides

On remote machines, create `~/.config/tmux/tmux.local.conf` to enable OSC 52
clipboard passthrough and correct terminal colors over SSH:

```tmux
# OSC 52 clipboard passthrough for remote terminals
set-option -as terminal-overrides ",xterm*:Ms=\\E]52;c%p1%.0s;%p2%s\\7"
set-option -as terminal-overrides ",tmux*:Ms=\\E]52;c%p1%.0s;%p2%s\\7"

set -as terminal-features ",xterm-*:RGB"
set -as terminal-features ",tmux-*:RGB"
set -as terminal-features ",ghostty:RGB"
```

`.config/tmux/tmux.conf` sources this file if it exists (`source-file -q`).

## Testing with Docker

Start a throwaway container with your `~/.config` mounted:

```sh
docker run -it -v $HOME/.config:/root/.config buildpack-deps
```
