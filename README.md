# config

Personal dotfiles managed with GNU Stow.

## Layout

| Package    | Purpose                                                  | Machines          |
|------------|----------------------------------------------------------|-------------------|
| `common/`  | Shared config for all machines (nvim, zsh, git, etc.)   | personal + VPS    |
| `personal/`| Personal-machine-only config (tmux with GUI bindings)    | personal only     |
| `vps/`     | VPS-specific config (tmux + OSC 52 clipboard passthrough)| VPS only          |

## Hammerspoon - Whisper Dictation

A lightweight push-to-talk voice dictation Spoon lives in `common/.hammerspoon/Spoons/Whisper.spoon/`. Hold **Caps Lock** (remapped to Control in System Settings) to record from the microphone, release to send the audio to a remote [mlx-audio](https://github.com/Blaizzy/mlx-audio) STT server for transcription, and the result is pasted into whatever app has focus.

**Requirements:**
- [Hammerspoon](https://www.hammerspoon.org/) (`brew install --cask hammerspoon`)
- `ffmpeg` on the local machine (`brew install ffmpeg`)
- An mlx-audio server running on the LAN (e.g. `mlx_audio.server --host 0.0.0.0 --port 8000`)
- Caps Lock remapped to Control in System Settings -> Keyboard -> Keyboard Shortcuts -> Modifier Keys
- Hammerspoon granted Accessibility and Microphone permissions

**Optional - Groq refinement:** If the `GROQ_API_KEY` environment variable is set, raw transcriptions are sent to [Groq](https://groq.com) (`openai/gpt-oss-120b`) for context-aware refinement before pasting. This fixes common STT errors like literal symbol spellings ("slash" instead of "/") and misheard technical terms. If the key is unset or the request fails, the raw transcription is pasted directly.

The server URL, model path, and other settings are configured at the top of `common/.hammerspoon/Spoons/Whisper.spoon/init.lua`.

## Install

Install GNU Stow first:

```sh
brew install stow
# or
sudo apt install stow
```

Then install:

```sh
# On a personal machine
./install.sh personal   # Stow common + personal, copy .zshrc

# On a VPS
./install.sh vps        # Stow common + vps

# Individual packages
./install.sh common     # Stow common package only
./install.sh zshrc      # Copy .zshrc only
```

If Stow reports `cannot stow ... over existing target`, move the existing files out of the way first:

```sh
mv ~/.config/nvim ~/.config/nvim.backup
mv ~/.shell ~/.shell.backup
# etc.
```

Generated directories such as `~/.config/opencode/node_modules` are intentionally not tracked and can stay in the target directory.

## Testing with Docker

```sh
docker run -it -v $HOME/.config:/root/.config buildpack-deps
```
