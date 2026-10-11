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

[Install mise](https://mise.jdx.dev/getting-started.html), then run:

```sh
./install.sh              # Link managed files into $HOME
./install.sh --zshrc      # Also copy .zshrc
```

The script trusts this repo's `mise.toml` and runs `mise dot apply`. To preview
changes first, run `mise trust mise.toml` and `mise dot apply --dry-run` from
the repo root. To check deployment later, run `mise dot status` here (or use
`mise -C /path/to/dotfiles dot status` from another directory).

mise will not overwrite existing real files when linking. Back up any
conflicting files before applying; avoid `--force` unless you have reviewed
what it would replace. Generated dependencies in
`.pi/agent/extensions/node_modules` are excluded from deployment.

On a VPS, also add the tmux overrides below.

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
