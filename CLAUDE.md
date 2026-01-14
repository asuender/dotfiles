# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Personal dotfiles/configuration repository for development tools and editors on macOS/Linux.

## Commands

### Deployment

```sh
./dev-env all           # Deploy all configuration files
./dev-env scripts       # Deploy scripts only
./dev-env all --dry     # Dry run - preview changes
```

### Testing with Docker

```sh
docker run -it -v $HOME/.config:/root/.config buildpack-deps
```

### Linting

```sh
# Shell scripts
shellcheck dev-env .setup/packages .setup/packages.omarchy .setup/tools .local/bin/compare-solution
shfmt -i 2 -w dev-env .setup/packages .setup/packages.omarchy
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

- `.zshrc` - Shell configuration (deployed to `~/.zshrc`)
- `.config/` - XDG config directory mirror (alacritty, ghostty, git, tmux, zed, etc.)
- `.local/bin/` - Scripts and helpers (deployed to `~/.local/bin/`)
- `.setup/` - Bootstrap scripts for new machines (packages, tools)
- `dev-env` - Main deployment script that copies configs to their destinations

The deployment flow: `dev-env` copies files from this repo to their standard locations:
- `.zshrc` -> `~/.zshrc`
- `.config/*` -> `~/.config/`
- `.local/bin/*` -> `~/.local/bin/`

## Key Tools

- Python: use `uv` for everything
- Node.js: nvm, pnpm

## Security

- Never commit `.env` files
- API keys go in `~/.config/.env`
