# config

Personal dotfiles managed with GNU Stow. Config lives at the repo root (`.config/`, `.shell/`, etc.) and is symlinked into `$HOME`.

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

Install GNU Stow first:

```sh
brew install stow
# or
sudo apt install stow
```

Then install:

```sh
./install.sh              # Stow dotfiles into $HOME
./install.sh --zshrc      # Stow dotfiles and copy .zshrc
```

On a VPS, also add the tmux overrides below.

If Stow reports `cannot stow ... over existing target`, move the existing files out of the way first:

```sh
mv ~/.config/nvim ~/.config/nvim.backup
mv ~/.shell ~/.shell.backup
# etc.
```

Generated directories such as `~/.config/opencode/node_modules` are intentionally not tracked and can stay in the target directory.

If upgrading from the old `common/` layout, unstow it first: `stow -D -t ~ common` (from the repo directory).

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
