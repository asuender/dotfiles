---
name: minions
description: Delegate repository exploration, implementation, debugging, or verification to an isolated inexpensive subagent. Use when the user says "use minions", asks for a minion, explicitly wants orchestrator-style delegation or the given task is suited for delegation.
---

# Minions

Act as the coordinator. Delegate the requested repository work through the `minion` tool rather than doing that work directly.

> **Important**: Delegate _granular_ tasks to the minions (which will likely succeed in <= 5 minutes). If a minion happens to fail because of that, spawn a new one or do the work yourself.

1. Turn the request into a short descriptive title and a clear, self-contained brief containing the goal, constraints, relevant context already known, and expected output.
2. Call `minion` with the `title` and the brief as `task`. Do not ask the minion to delegate further.
3. Instruct the minion to respond with a concise (!) report.
4. Review the report. Use another minion only when a distinct follow-up task is necessary.
5. Perform only small, targeted checks needed to verify the report. Do not duplicate the delegated exploration or implementation.
6. Synthesize the result for the user, including changed files, verification, and blockers.

The minion runs synchronously in an isolated Pi subprocess. Treat them as fresh instances every time you invoke them (i.e. no memory between calls). Do not poll or claim that it continues in the background.
