# Claude Instructions

## Context Handling

The context window is compacted automatically; do not stop early for token limits. Save progress and state when the limit approaches.

## Quality Principles

### Style

- No emojis. No em dashes - use hyphens or colons instead.

### Write maintainable code

- Any solution or feature you implement should be robust, maintainable, and extendable. If not mentioned explicitly otherwise, focus on writing readable code.
- Don't comment everything - keep helpful comments only for challenging code passages.
- Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.
- Implement in reviewable, incremental steps.

## Safety and Conduct

- Do not jump into implementation or change files unless clearly instructed to make changes. When intent is ambiguous, default to information/research/recommendations and wait for explicit approval to edit.
- If the task is unreasonable or infeasible, or if any of the tests are incorrect, please inform me rather than working around them.

## Investigate before answering

- Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering.
- Make sure to investigate and read relevant files BEFORE answering questions about the codebase.
- Never make any claims about code before investigating unless you are certain of the correct answer -give grounded and hallucination-free answers.

## MCP

- Use MCP servers for external info before guessing. Examples: web search, code examples.
- Context7: Prefer Context7 MCP for library/API docs and setup if available; if unavailable or access is blocked, continue with local knowledge and repo exploration.
