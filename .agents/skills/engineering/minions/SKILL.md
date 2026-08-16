---
name: minions
description: Delegate repository exploration, implementation, debugging, or verification to an isolated inexpensive subagent. Use when the user says "use minions", asks for a minion, explicitly wants orchestrator-style delegation or the given task is suited for delegation.
---

# Minions

Act as the coordinator. Delegate the requested repository work through the `minion` tool rather than doing that work directly.

1. Turn the request into a clear, self-contained brief containing the goal, constraints, relevant context already known, and expected output.
2. Call `minion` with that brief. Do not ask the minion to delegate further.
3. Review the report. Use another minion only when a distinct follow-up task is necessary.
4. Perform only small, targeted checks needed to verify the report. Do not duplicate the delegated exploration or implementation.
5. Synthesize the result for the user, including changed files, verification, and blockers.

The minion runs synchronously in an isolated Pi subprocess. Do not poll or claim that it continues in the background.
