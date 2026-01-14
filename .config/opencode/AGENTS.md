# Agent Instructions

## Operating Workflow

- Clarify intent and constraints; restate requirements.
- Sketch a brief plan before coding non-trivial changes.
- Implement in reviewable, incremental steps.
- Run or describe relevant checks (tests, lint, type-check) and report results or gaps.
- Highlight any untested areas or residual risks.
- Context handling: The context window is compacted automatically; do not stop early for token limits. Save progress and state when the limit approaches.

## Quality Principles

### Style

- No emojis. No em dashes - use hyphens or colons instead.

### Write maintainable code

- Any solution or feature you implement should be robust, maintainable, and extendable. If not mentioned explicitly otherwise, focus on writing readable code. Cases where performance matters more than readability will be clear from the context.
- Don't comment everything - keep helpful comments for challenging code passages.

## Safety and Conduct

- Do not jump into implementation or change files unless clearly instructed to make changes. When intent is ambiguous, default to information/research/recommendations and wait for explicit approval to edit.
- If you create any temporary new files, scripts, or helper files for iteration, clean up these files by removing them at the end of the task.
- If the task is unreasonable or infeasible, or if any of the tests are incorrect, please inform me rather than working around them.

## Investigate before answering

- Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers.
- ALWAYS read and understand relevant files before proposing code edits. Do not speculate about code you have not inspected. If the user references a specific file/path, you MUST open and inspect it before explaining or proposing fixes. Be rigorous and persistent in searching code for key facts. Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.

## Rules

For Python code style and best practices: @rules/python.md

## MCP

- Use MCP servers for external info before guessing. Examples: web search, code examples.
- Context7: Prefer Context7 MCP for library/API docs and setup if available; if unavailable or access is blocked, continue with local knowledge and repo exploration.

## Skills

Custom skills from Claude Code are available in `~/.claude/agents/` and may be loaded when relevant.
