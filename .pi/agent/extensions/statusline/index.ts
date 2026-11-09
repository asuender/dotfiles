import { basename } from "node:path";

import type { Model } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

import {
  cacheHitRatio,
  fetchUsage,
  formatTokens,
  formatUsageWindow,
  usageLevel,
  type TokenUsage,
  type UsageSnapshot,
} from "./core.ts";

const PROVIDER_ID = "openai-codex";
const REQUEST_TIMEOUT_MS = 10_000;

type UsageState = UsageSnapshot | "loading" | "unavailable" | undefined;

function sessionUsages(ctx: ExtensionContext): TokenUsage[] {
  return ctx.sessionManager
    .getBranch()
    .flatMap((entry) =>
      entry.type === "message" && entry.message.role === "assistant" ? [entry.message.usage] : [],
    );
}

function renderProject(cwd: string, branch: string | null, theme: Theme): string {
  const project = theme.fg("text", basename(cwd) || "/");
  // Pi reports a detached HEAD as the literal branch name "detached".
  if (!branch || branch === "detached") return project;
  return `${project} ${theme.fg("dim", `(git: ${branch})`)}`;
}

function renderContext(ctx: ExtensionContext, theme: Theme): string {
  const context = ctx.getContextUsage();
  if (context?.percent == null || context.tokens == null) return theme.fg("text", "ctx ?");

  const percent = Math.round(context.percent);
  const counts = `(${formatTokens(context.tokens)}/${formatTokens(context.contextWindow)})`;
  const hitRatio = cacheHitRatio(sessionUsages(ctx));
  const cache = hitRatio === undefined ? "" : ` ${theme.fg("dim", `ch ${(hitRatio * 100).toFixed(1)}%`)}`;

  return `${theme.fg(usageLevel(percent), `ctx ${percent}%`)} ${theme.fg("dim", counts)}${cache}`;
}

function renderUsage(usage: UsageState, theme: Theme): string | undefined {
  if (usage === undefined) return undefined;
  if (usage === "loading") return theme.fg("dim", "OpenAI usage loading");
  if (usage === "unavailable") return theme.fg("warning", "OpenAI usage unavailable");

  const windows = usage.windows
    .map((window) => theme.fg(usageLevel(window.usedPercent), formatUsageWindow(window)))
    .join(theme.fg("dim", ", "));
  return `${theme.fg("dim", "OpenAI")} ${windows}`;
}

export default function statuslineExtension(pi: ExtensionAPI): void {
  let active = false;
  let generation = 0;
  let request: AbortController | undefined;
  let usage: UsageState;
  let requestRender: (() => void) | undefined;

  function isSubscriptionModel(ctx: ExtensionContext, model: Model<any> | undefined): boolean {
    if (!model || model.provider !== PROVIDER_ID) return false;

    const provider = ctx.modelRegistry.getProvider(PROVIDER_ID);
    return ctx.modelRegistry.isUsingOAuth(model) && provider?.auth.oauth?.isSubscription === true;
  }

  function renderStatusline(ctx: ExtensionContext, theme: Theme, branch: string | null): string {
    const thinking = pi.getThinkingLevel();
    const model =
      theme.fg("text", ctx.model?.id ?? "no model") +
      (thinking === "off" ? "" : ` ${theme.fg("dim", thinking)}`);
    const sessionName = pi.getSessionName();

    return [
      renderProject(ctx.cwd, branch, theme),
      sessionName ? theme.fg("text", sessionName) : undefined,
      model,
      renderContext(ctx, theme),
      renderUsage(usage, theme),
    ]
      .filter((segment) => segment !== undefined)
      .join(theme.fg("dim", " · "));
  }

  function installFooter(ctx: ExtensionContext): void {
    ctx.ui.setFooter((tui, theme, footerData) => {
      requestRender = () => tui.requestRender();

      return {
        dispose() {
          requestRender = undefined;
        },
        invalidate() {},
        render(width: number): string[] {
          const statusline = renderStatusline(ctx, theme, footerData.getGitBranch());
          const lines = [truncateToWidth(statusline, width)];

          // setFooter replaces the built-in status line, so other extensions render here.
          const statuses = [...footerData.getExtensionStatuses().entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, text]) => text.replace(/\s*[\r\n]+\s*/g, " "))
            .join(" ");
          if (statuses) lines.push(truncateToWidth(statuses, width, theme.fg("dim", "...")));

          return lines;
        },
      };
    });
  }

  function setUsage(next: UsageState): void {
    usage = next;
    requestRender?.();
  }

  function stop(): void {
    active = false;
    generation++;

    request?.abort();
    request = undefined;
    setUsage(undefined);
  }

  async function updateUsage(ctx: ExtensionContext, run: number): Promise<void> {
    if (!active || run !== generation) return;

    try {
      const auth = await ctx.modelRegistry.getProviderAuth(PROVIDER_ID);
      if (!active || run !== generation) return;

      const accessToken = auth?.auth.apiKey;
      if (!accessToken) {
        throw new Error("OpenAI subscription authentication is unavailable");
      }

      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      timeout.unref?.();

      try {
        const snapshot = await fetchUsage(accessToken, {
          signal: controller.signal,
        });
        if (!active || run !== generation) return;

        setUsage(snapshot);
      } finally {
        clearTimeout(timeout);
        if (request === controller) request = undefined;
      }
    } catch {
      if (!active || run !== generation) return;

      setUsage("unavailable");
    }
  }

  function refresh(ctx: ExtensionContext, showLoading = false): void {
    if (!active) return;

    const run = ++generation;
    request?.abort();
    request = undefined;
    if (showLoading) setUsage("loading");
    void updateUsage(ctx, run);
  }

  function selectModel(ctx: ExtensionContext, model: Model<any> | undefined): void {
    if (!isSubscriptionModel(ctx, model)) {
      stop();
      return;
    }

    active = true;
    refresh(ctx, true);
  }

  pi.on("session_start", async (_event, ctx) => {
    installFooter(ctx);
    selectModel(ctx, ctx.model);
  });

  pi.on("model_select", async (event, ctx) => {
    selectModel(ctx, event.model);
    requestRender?.();
  });

  pi.on("thinking_level_select", async () => {
    requestRender?.();
  });

  pi.on("session_info_changed", async () => {
    requestRender?.();
  });

  pi.on("agent_end", async (_event, ctx) => {
    refresh(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    stop();
    // The footer closes over this session's ctx, which throws once the session is replaced.
    ctx.ui.setFooter(undefined);
  });
}
