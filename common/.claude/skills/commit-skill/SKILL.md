---
name: committing-code
description: Generates clear commit messages. Use when tasked to commit any code.
context: fork
allowed-tools:
  - Bash(git diff:*)
  - Bash(git diff)
  - Bash(git status:*)
  - Bash(git status)
  - Bash(git commit:*)
  - Bash(git log:*)
  - Bash(git add:*)
  - Bash(git add *)
  - Read
---

# Commit context

- Git status: !`git status`
- Unstaged changes !`git diff`

# Instructions

Your task is to commit the working changes in the current repo.

1. Stage relevant files with `git add <files>` or `git add .`
2. Create the commit following the conventional format below

**Note:** use all `git` commands without the `-C <dir>` argument!

# Conventional Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

## Types

| Type | Purpose |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Maintenance tasks |

## Rules

- Keep subject line under 72 characters
- Use imperative mood: "add feature" not "added feature"
- Separate subject from body with a blank line
- Use body to explain what and why, not how, in at most 4 sentences

## Example

```
feat(auth): add OAuth2 login support

Implement OAuth2 authentication flow with support for Google and GitHub
providers. This replaces the legacy session-based authentication.

Closes #123
```

