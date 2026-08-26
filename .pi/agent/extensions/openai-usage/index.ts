import type { Model } from "@earendil-works/pi-ai";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import {
  fetchUsage,
  formatUsageWindow,
  type UsageSnapshot,
  type UsageWindow,
} from "./core.ts";

const PROVIDER_ID = "openai-codex";
const STATUS_KEY = "openai-usage";
const REQUEST_TIMEOUT_MS = 10_000;

export default function openAIUsageExtension(pi: ExtensionAPI): void {
  let active = false;
  let generation = 0;
  let request: AbortController | undefined;

  function isSubscriptionModel(
    ctx: ExtensionContext,
    model: Model<any> | undefined,
  ): boolean {
    if (!model || model.provider !== PROVIDER_ID) return false;

    const provider = ctx.modelRegistry.getProvider(PROVIDER_ID);
    return (
      ctx.modelRegistry.isUsingOAuth(model) &&
      provider?.auth.oauth?.isSubscription === true
    );
  }

  function windowColor(
    ctx: ExtensionContext,
    window: UsageWindow,
  ): "error" | "warning" | "muted" {
    if (window.remainingPercent <= 10) return "error";
    if (window.remainingPercent <= 25) return "warning";
    return "muted";
  }

  function renderSnapshot(
    ctx: ExtensionContext,
    snapshot: UsageSnapshot,
  ): void {
    const prefix = ctx.ui.theme.fg("dim", "OpenAI ");
    const windows = snapshot.windows
      .map((window) =>
        ctx.ui.theme.fg(windowColor(ctx, window), formatUsageWindow(window)),
      )
      .join(ctx.ui.theme.fg("dim", " · "));
    ctx.ui.setStatus(STATUS_KEY, `${prefix}${windows}`);
  }

  function stop(ctx: ExtensionContext): void {
    active = false;
    generation++;

    request?.abort();
    request = undefined;
    ctx.ui.setStatus(STATUS_KEY, undefined);
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

        renderSnapshot(ctx, snapshot);
      } finally {
        clearTimeout(timeout);
        if (request === controller) request = undefined;
      }
    } catch {
      if (!active || run !== generation) return;

      ctx.ui.setStatus(
        STATUS_KEY,
        ctx.ui.theme.fg("warning", "OpenAI usage unavailable"),
      );
    }
  }

  function refresh(ctx: ExtensionContext, showLoading = false): void {
    if (!active) return;

    const run = ++generation;
    request?.abort();
    request = undefined;
    if (showLoading) {
      ctx.ui.setStatus(
        STATUS_KEY,
        ctx.ui.theme.fg("dim", "OpenAI usage loading"),
      );
    }
    void updateUsage(ctx, run);
  }

  function selectModel(
    ctx: ExtensionContext,
    model: Model<any> | undefined,
  ): void {
    if (!isSubscriptionModel(ctx, model)) {
      stop(ctx);
      return;
    }

    active = true;
    refresh(ctx, true);
  }

  pi.on("session_start", async (_event, ctx) => {
    selectModel(ctx, ctx.model);
  });

  pi.on("model_select", async (event, ctx) => {
    selectModel(ctx, event.model);
  });

  pi.on("agent_end", async (_event, ctx) => {
    refresh(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    stop(ctx);
  });
}
