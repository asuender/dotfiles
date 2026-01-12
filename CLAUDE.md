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
shellcheck dev-env .setup/packages .setup/packages.omarchy .setup/tools scripts/compare-solution
shfmt -i 2 -w dev-env .setup/packages .setup/packages.omarchy

# Lua files (Neovim)
stylua nvim/
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

- `.dev/` - Shell environment files (.zshrc)
- `.setup/` - Bootstrap scripts for new machines (packages, tools)
- `.helpers/` - Tmux helper scripts (tmux-quicky, tmux-clone, journal)
- `dev-env` - Main deployment script that copies configs to their destinations
- Individual tool directories (nvim/, zed/, tmux/, ghostty/, etc.) contain per-tool configs

The deployment flow: `dev-env` copies files from this repo to their standard locations (e.g., `.dev/.zshrc` -> `~/.zshrc`, `.helpers/*` -> `~/.local/bin/helpers/`).

## Key Tools

- Python: use `uv` for everything
- Node.js: nvm, pnpm
- Neovim: LazyVim-based config in `nvim/lua/plugins/`

## Security

- Never commit `.env` files
- API keys go in `~/.config/.env`
- `gh/hosts.yml` may contain tokens
