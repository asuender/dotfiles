# config

Personal dotfiles managed with GNU Stow.

## Layout

- `home/` - canonical Stow package for shared home-directory config
- `.zshrc` - copied manually because it is machine-specific

The `home/` package contains shared files such as `.config/`, `.shell/`, `.local/bin/`, `.agents/`, `.claude/`, `.pi/`, and `.templates/`.

## Install

Install GNU Stow first:

```sh
brew install stow
# or
sudo apt install stow
```

Then install:

```sh
./install.sh all    # Stow home package and copy .zshrc
./install.sh home   # Stow shared home package only
./install.sh zshrc  # Copy .zshrc only
```

If Stow reports `cannot stow ... over existing target`, move the existing copied files out of the way first. This is expected during the first migration from copied files to symlinks.

Example:

```sh
mv ~/.shell ~/.shell.backup
mv ~/.agents ~/.agents.backup
mv ~/.claude ~/.claude.backup
mv ~/.templates ~/.templates.backup
mv ~/.config/nvim ~/.config/nvim.backup
```

Generated directories such as `~/.config/opencode/node_modules` are intentionally not tracked and can stay in the target directory as long as they are not present in this repo.

## Testing with Docker

```sh
docker run -it -v $HOME/.config:/root/.config buildpack-deps
```
