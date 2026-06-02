# config

Personal dotfiles managed with GNU Stow.

## Layout

| Package    | Purpose                                                  | Machines          |
|------------|----------------------------------------------------------|-------------------|
| `common/`  | Shared config for all machines (nvim, zsh, git, etc.)   | personal + VPS    |
| `personal/`| Personal-machine-only config (tmux with GUI bindings)    | personal only     |
| `vps/`     | VPS-specific config (tmux + OSC 52 clipboard passthrough)| VPS only          |

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
