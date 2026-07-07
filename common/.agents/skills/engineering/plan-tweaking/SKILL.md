---
name: plan-tweaking
description: Use when the user asks to review, tweak, or refine an implementation plan. Cross-checks the plan for bugs, inconsistencies, and convention violations while preserving global and project-level instructions.
---

## Overview

Review and refine implementation plans that the user has already drafted. Assume the user put thought into the plan; your job is to surface things they may have missed (bugs, inconsistencies, simplifications) while respecting project conventions.

## Workflow

1. Read the plan from disk. If no plan file has been disclosed, do not search for one. Exit early and ask the user to provide the respective file.

2. Think through the plan. Try to understand user intent as much as possible. If needed, explore the codebase (or prior implementation plans) to fully gather the necessary context.

3. Review the plan against the following checklist:
   - **Correctness**: missing steps, wrong order, unhandled edge cases.
   - **Consistency**: internal contradictions, conflicts with codebase behaviour.
   - **Simplicity**: steps that can be merged or removed per "smallest correct implementation".
   - **Conventions**: violations of global/project AGENTS.md and code style.

4. If you see any segments surrounded by `VALIDATE`, treat them as (optional) thoughts from the user where they might be unsure. Evaluate their feasibility and include your results in your report.

5. Collect your proposed changes and report them back. Be as brief as possible, as elaborate as needed. For each suggestion, dedicate one paragraph: `**<problem>**:\n<max 5-7 sentences describing the problem and a solution>`.

6. After drafting your changes, the user may discuss them back and forth and eventually accept them. At this point, write the changes back to the plan file.

7. If any `VALIDATE` segments will be abandoned (e.g. no use for them, too complex, etc.), move them into a dedicated `## Leftovers` section and explain why.

## Rules

- While drafting your changes, do not violate any global or project-specific instructions. As an example, when they say to keep things simple, do not spin off and create a super complex architecture. However, you are free to mention cases where such alternatives might be better briefly.
- Do not write changes back to the plan file until the user has explicitly accepted them (see the last workflow step).
