import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("diff", {
    description: "Open lumen diff for the current working tree",
    handler: async (args, ctx) => {
      const extraArgs = args.trim().split(/\s+/).filter(Boolean);

      if (ctx.hasUI) {
        ctx.ui.notify("Opening lumen diff…", "info");
      }

      const stdin = process.stdin;
      const wasRaw = stdin.isTTY && stdin.isRaw;
      const wasPaused = stdin.isPaused();

      // Pi's TUI also listens on stdin. Pause the parent stream while the
      // interactive child owns the terminal, otherwise keystrokes race with the
      // prompt/input box instead of reaching lumen.
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();

      try {
        const exitCode = await runLumenDiff(extraArgs);
        if (ctx.hasUI) {
          const level = exitCode === 0 ? "info" : "warning";
          ctx.ui.notify(`lumen diff exited with code ${exitCode}`, level);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (ctx.hasUI) {
          ctx.ui.notify(`Failed to open lumen diff: ${message}`, "error");
        }
        throw error;
      } finally {
        if (stdin.isTTY && wasRaw) {
          stdin.setRawMode(true);
        }
        if (!wasPaused) {
          stdin.resume();
        }
      }
    },
  });
}

function runLumenDiff(extraArgs: string[]): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn("lumen", ["diff", ...extraArgs], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => resolve(code));
  });
}
