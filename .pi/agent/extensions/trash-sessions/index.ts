import { SessionManager, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

import {
  completeAge,
  cutoffFromAge,
  parseCommandArgs,
  selectStaleSessions,
  summarizeTrashResults,
  trashSessionFile,
} from "./core.ts";

export default function trashSessionsExtension(pi: ExtensionAPI): void {
  pi.registerCommand("trash-sessions", {
    description: "Trash sessions last used before an age (usage: /trash-sessions [all] 1 mo)",
    getArgumentCompletions: (prefix) => {
      const items = completeAge(prefix);
      return items.length > 0 ? items : null;
    },
    handler: async (args, ctx) => {
      const parsed = parseCommandArgs(args);
      if (!parsed.ok) {
        ctx.ui.notify(parsed.error, "warning");
        return;
      }

      const sessions =
        parsed.value.scope === "all" ? await SessionManager.listAll() : await SessionManager.list(ctx.cwd);
      const cutoff = cutoffFromAge(parsed.value.age);
      const stale = selectStaleSessions(sessions, {
        cutoff,
        currentPath: ctx.sessionManager.getSessionFile(),
      });

      if (stale.length === 0) {
        ctx.ui.notify(`No sessions older than ${parsed.value.age.input}`, "info");
        return;
      }

      const date = cutoff.toISOString().slice(0, 10);
      const noun = stale.length === 1 ? "session" : "sessions";
      const confirmed = await ctx.ui.confirm(
        "Trash old sessions?",
        `Move ${stale.length} ${noun} last used before ${date} to trash?`,
      );
      if (!confirmed) {
        ctx.ui.notify("Cancelled", "info");
        return;
      }

      const results = [];
      for (const session of stale) {
        results.push(await trashSessionFile(session.path));
      }

      const summary = summarizeTrashResults(results);
      ctx.ui.notify(summary.message, summary.level);
    },
  });
}
