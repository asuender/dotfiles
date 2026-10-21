# Agent instructions

Personal dotfiles deployed with mise. Config lives at the repo root (`.config/`, `.shell/`, etc.) and is linked into `$HOME` using `mise.toml`.

## Dotfile mappings

- `mise.toml` defines the mappings. Apply mapping changes with `mise dotfiles apply`.
- `~/.agents` uses `mode = "symlink"`: the entire directory points to this repo's `.agents/`. Global skill installs into `~/.agents/skills/` land directly in the repo, with no copying or relinking needed.
- Only `~/.agents` is tracked. Agent-specific skill dirs such as `~/.claude/skills/` are untracked copies created by the skills CLI (`skills add -g -a claude-code`). It's fine that they are copies, not symlinks: don't try to track or link them.
- Other mappings currently use `symlink-each`: existing files are linked individually, but newly created files under `$HOME` are not automatically imported into the repo.
- Before changing a directory from `symlink-each` to `symlink`, compare the live directory with the repo and preserve any live-only files in the repo. Preview with `mise dotfiles apply --dry-run` before applying.

## Development

Pi extensions live under `./.pi/agent/extensions/`. Most of them are self-contained TypeScript files, bigger ones live in sub-folders. Read respective `README.md` files for additional context, if the exist.
