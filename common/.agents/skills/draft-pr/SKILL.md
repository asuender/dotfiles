---
name: draft-pr
description: Commit, push, and create a draft PR using the project's or a fallback pr description format.
user-invocable: true
---

# Create Draft PR

Commit all changes, push to remote, and create a draft pull request with a focused generated description.

## Steps

1. Run `git status` to see changes
2. Run `git diff` to understand what changed
3. Run `git log` to see commit message style
4. If on `main`, create a new branch in the format `<initials>/<feature>` or the project's branch naming convention, then switch to it
5. Stage and commit changes with a concise message
6. Push branch to remote with `-u` flag
7. Generate the PR description using the project's pr description format found in `.github/pull_request_template.md` or, if not available, the fallback format (see below).
8. Create draft PR using `gh pr create --draft`
9. If you created the branch (were on `main`), switch back to `main` after the PR is created

## Fallback PR Body Format

```markdown
## Summary

Fixes #<issue-number or remove this line if not applicable>

<2-3 sentence summary of what this PR accomplishes>

## Root Cause

<For bug fixes only - explain what caused the issue. Delete this entire section for features/refactors>

## Changes

<List changes as bullet points using imperative mood: "Add ...", "Fix ...", "Update ...", "Remove ...">

- <First change>
- <Second change>

## Details

<Optional, for new features only - explain complex changes that need more context than a single bullet point. Delete this section if not needed>

## Testing

<Describe how you verified the changes work correctly. Include steps others can follow to test>
```

## Rules

- PR title should be succinct (no "feat:" prefix, but "fix:" is ok for bug fixes)
- Do NOT include a file-by-file summary of code changes.
- Do NOT include a test plan with checkboxes.
- Do NOT include "Generated with Claude Code" or similar footers
- Keep the PR description concise and focused on intent and approach
- Use HEREDOC for the PR body to preserve formatting
