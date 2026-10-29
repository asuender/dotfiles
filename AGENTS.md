# Agent instructions

Personal dotfiles deployed with mise. Config lives at the repo root (`.config/`, `.shell/`, etc.) and is linked into `$HOME` using `mise.toml`.

## Dotfile mappings

- `mise.toml` defines the mappings. Apply mapping changes with `mise dotfiles apply`.
- `~/.agents` uses `mode = "symlink"`: the entire directory points to this repo's `.agents/`. Global skill installs into `~/.agents/skills/` land directly in the repo, with no copying or relinking needed.
- `~/.claude/skills/` is an untracked real directory holding one relative symlink per skill (`<name> -> ../../.agents/skills/<name>`). Don't link the whole directory: Claude Code writes its own `synced/` and `.trash/` there, and agents that scan `~/.agents/skills` recursively (e.g. pi) would pick them up.
- Install skills for `.agents` only (`skills add <source> -g -a universal`, no `-a claude-code`), then run `mise run link-claude-skills` (global task in `.config/mise/config.toml`). The task links every skill missing from `~/.claude/skills/` and removes dangling links. Run it after adding or removing a skill (CLI or custom) and on fresh machines; updates need no rerun.
- Other mappings currently use `symlink-each`: existing files are linked individually, but newly created files under `$HOME` are not automatically imported into the repo.
- Before changing a directory from `symlink-each` to `symlink`, compare the live directory with the repo and preserve any live-only files in the repo. Preview with `mise dotfiles apply --dry-run` before applying.

## Development

Pi extensions live under `./.pi/agent/extensions/`. Most of them are self-contained TypeScript files, bigger ones live in sub-folders. Read respective `README.md` files for additional context, if the exist.
