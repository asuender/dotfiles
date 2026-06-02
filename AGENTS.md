# AGENTS.md

This file provides guidance to AI coding agents (Claude, Codex, OpenCode, etc.) when working with this repository.

## Repository Overview

Personal dotfiles managed with [GNU Stow](https://www.gnu.org/software/stow/). Each top-level directory is a Stow package that gets symlinked into `$HOME`.

## Package Layout

| Package    | Purpose                                                  | Machines          |
|------------|----------------------------------------------------------|-------------------|
| `common/`  | Shared config for all machines (nvim, zsh, git, etc.)   | personal + VPS    |
| `personal/`| Personal-machine-only config (tmux with GUI bindings)    | personal only     |
| `vps/`     | VPS-specific config (tmux + OSC 52 clipboard passthrough)| VPS only          |

### What goes where

- **common**: everything that works identically on any machine — editor config, shell helpers, git settings, Ghostty, Waybar, etc.
- **personal**: config that references GUI apps or personal-machine tools (tmux theme, `nvim`/`opencode`/`pi` window bindings, `hypr`/`waybar`).
- **vps**: config that needs VPS-specific overrides (tmux with OSC 52 terminal override for clipboard passthrough).

## Stow Usage

```sh
# On a personal machine
stow -t "$HOME" common
stow -t "$HOME" personal

# On a VPS
stow -t "$HOME" common
stow -t "$HOME" vps
```

Or use `install.sh`:

```sh
./install.sh personal   # common + personal
./install.sh vps        # common + vps
```

## Key Conventions

- Never commit secrets — API keys go in `~/.config/.env` (not tracked).
- The `.stow-local-ignore` in each package controls which files Stow skips.
- `common/.config/opencode/AGENTS.md` contains OpenCode-specific instructions.
- `common/.claude/CLAUDE.md` contains Claude Code-specific instructions.
