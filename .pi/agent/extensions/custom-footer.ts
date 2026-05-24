import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const DOT = " · ";
const ICON_MODEL = "󰚩";
const ICON_THINK = "󰌵";
const ICON_PATH = "󰉋";
const ICON_BRANCH = "";
const ICON_CONTEXT = "󰈙";

function compactPath(path: string): string {
  const home = process.env.HOME;
  return home && path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

function formatContextSize(value: number): string {
  return `${Math.round(value / 1000)}k`;
}

function formatContextUsage(usage: unknown, contextWindow: number | undefined): string {
  const tokens = typeof (usage as { tokens?: unknown } | undefined)?.tokens === "number"
    ? (usage as { tokens: number }).tokens
    : undefined;
  if (tokens === undefined || !contextWindow) return "ctx n/a";

  const pct = Math.round((tokens / contextWindow) * 100);
  return `${pct}%/${formatContextSize(contextWindow)}`;
}

export default function customFooter(pi: ExtensionAPI) {
  let requestRender: (() => void) | undefined;

  const rerender = () => requestRender?.();

  pi.on("model_select", rerender);
  pi.on("thinking_level_select", rerender);
  pi.on("message_end", rerender);
  pi.on("session_compact", rerender);

  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      const renderCurrent = () => tui.requestRender();
      requestRender = renderCurrent;
      const unsubscribeBranch = footerData.onBranchChange(renderCurrent);

      return {
        dispose() {
          unsubscribeBranch();
          if (requestRender === renderCurrent) requestRender = undefined;
        },
        invalidate() { },
        render(width: number): string[] {
          const model = ctx.model?.name ?? ctx.model?.id ?? "no-model";
          const thinking = pi.getThinkingLevel();
          const cwd = compactPath(ctx.cwd);
          const branch = footerData.getGitBranch() ?? "not git";
          const contextWindow = ctx.model?.contextWindow;
          const contextUsage = formatContextUsage(ctx.getContextUsage(), contextWindow);

          const sep = theme.fg("dim", DOT);
          const parts = [
            `${theme.fg("syntaxFunction", ICON_MODEL)} ${theme.fg("accent", model)}`,
            `${theme.fg("syntaxKeyword", ICON_THINK)} ${theme.fg("thinkingText", thinking)}`,
            `${theme.fg("syntaxString", ICON_PATH)} ${theme.fg("mdLink", cwd)}`,
            `${theme.fg("syntaxVariable", ICON_BRANCH)} ${theme.fg("success", branch)}`,
            `${theme.fg("syntaxNumber", ICON_CONTEXT)} ${theme.fg("warning", contextUsage)}`,
          ];

          const footerText = parts.join(sep);
          return [visibleWidth(footerText) > width ? truncateToWidth(footerText, width) : footerText];
        },
      };
    });
  });
}
