/**
 * Permission Gate Extension
 *
 * Prompts for confirmation before running any commands using the `bash` tool.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return undefined;

    const command = event.input.command as string;

    if (!ctx.hasUI) {
      // In non-interactive mode, block by default
      return { block: true, reason: "Bash commands blocked (no UI for confirmation)" };
    }

    const choice = await ctx.ui.select(`Request to run command:\n\n  ${command}\n\nAllow?`, ["Yes", "No"]);

    if (choice !== "Yes") {
      return { block: true, reason: "Blocked by user" };
    }

    return undefined;
  });
}
