# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Personal dotfiles/configuration repository for development tools and editors on macOS/Linux, managed with GNU Stow.

## Commands

### Deployment

```sh
./install.sh personal      # Stow common + personal packages, copy .zshrc (personal machine)
./install.sh vps           # Stow common + vps packages (VPS)
./install.sh common        # Stow shared package only
```

### Testing with Docker

```sh
docker run -it -v $HOME/.config:/root/.config buildpack-deps
```

### Linting

```sh
# Shell scripts
shellcheck install.sh .setup/packages .setup/packages.omarchy .setup/tools .local/bin/compare-solution
shfmt -i 2 -w install.sh .setup/packages .setup/packages.omarchy
```

### Package Installation (Ubuntu/Debian)

```sh
./.setup/packages    # Idempotent - install/update packages
./.setup/tools       # One-time tool installations
```

### Package Installation (Omarchy/Arch)

```sh
./.setup/packages.omarchy    # Idempotent - install packages via pacman/yay
./.setup/tools               # One-time tool installations (platform-agnostic)
```

## Architecture

Stow packages and their purpose:

- **`common/`** — shared config deployed on all machines: nvim, git, ghostty, zsh helpers, agents, claude settings, etc.
- **`personal/`** — personal-machine tmux config (GUI app bindings, theme)
- **`vps/`** — VPS tmux config (personal config + OSC 52 clipboard passthrough terminal overrides)

Other files:
- `.zshrc` — shell config, copied manually because it is machine-specific
- `.setup/` — bootstrap scripts for new machines

## Key Tools

- Python: use `uv` for everything
- Node.js: nvm, pnpm

## Security

- Never commit `.env` files
- API keys go in `~/.config/.env`
