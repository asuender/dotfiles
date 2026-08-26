import { z } from "zod";

const OPENAI_AUTH_CLAIM = "https://api.openai.com/auth";

const UsageWindowResponseSchema = z.object({
  used_percent: z.number().min(0).max(100),
  limit_window_seconds: z.number().int().positive(),
  reset_at: z.number().int().positive().optional(),
});

const RateLimitResponseSchema = z.object({
  primary_window: UsageWindowResponseSchema.nullable(),
  secondary_window: UsageWindowResponseSchema.nullable(),
});

const UsageResponseSchema = z.object({
  plan_type: z.string().optional(),
  rate_limit: RateLimitResponseSchema,
  additional_rate_limits: z
    .array(
      z.object({
        limit_name: z.string().min(1),
        metered_feature: z.string().optional(),
        rate_limit: RateLimitResponseSchema,
      }),
    )
    .optional()
    .default([]),
});

const AccountPayloadSchema = z.object({
  [OPENAI_AUTH_CLAIM]: z.object({
    chatgpt_account_id: z.string().min(1),
  }),
});

type UsageWindowResponse = z.infer<typeof UsageWindowResponseSchema>;
type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;

export interface UsageWindow {
  id: string;
  label: string;
  remainingPercent: number;
  durationSeconds: number;
  resetsAt?: number;
}

export interface UsageSnapshot {
  planType?: string;
  windows: UsageWindow[];
}

export interface FetchUsageOptions {
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}

function shortLimitName(value: string): string {
  const name = value.trim();
  const codexSuffix = name.match(/codex[-_\s]+(.+)$/i)?.[1];
  return (codexSuffix ?? name).replace(/[-_]+/g, " ");
}

function normalizeWindow(
  window: UsageWindowResponse,
  id: string,
  limitName?: string,
): UsageWindow {
  const durationLabel = formatDuration(window.limit_window_seconds);

  return {
    id,
    label: limitName ? `${limitName} ${durationLabel}` : durationLabel,
    remainingPercent: 100 - window.used_percent,
    durationSeconds: window.limit_window_seconds,
    ...(window.reset_at !== undefined
      ? { resetsAt: window.reset_at * 1000 }
      : {}),
  };
}

function normalizeRateLimit(
  rateLimit: RateLimitResponse,
  idPrefix: string,
  limitName?: string,
): UsageWindow[] {
  return [
    rateLimit.primary_window
      ? normalizeWindow(
          rateLimit.primary_window,
          `${idPrefix}:primary`,
          limitName,
        )
      : undefined,
    rateLimit.secondary_window
      ? normalizeWindow(
          rateLimit.secondary_window,
          `${idPrefix}:secondary`,
          limitName,
        )
      : undefined,
  ].filter((window): window is UsageWindow => window !== undefined);
}

export function parseUsagePayload(payload: unknown): UsageSnapshot {
  const usage = UsageResponseSchema.parse(payload);
  const windows = normalizeRateLimit(usage.rate_limit, "default");

  usage.additional_rate_limits.forEach((additional, index) => {
    windows.push(
      ...normalizeRateLimit(
        additional.rate_limit,
        `additional:${index}`,
        shortLimitName(additional.limit_name),
      ),
    );
  });

  if (windows.length === 0) {
    throw new Error("OpenAI usage response contained no rate-limit windows");
  }

  return {
    ...(usage.plan_type ? { planType: usage.plan_type } : {}),
    windows,
  };
}

export function formatDuration(seconds: number): string {
  if (seconds % 86_400 === 0) return `${seconds / 86_400}d`;
  if (seconds % 3_600 === 0) return `${seconds / 3_600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

export function formatUsageWindow(window: UsageWindow): string {
  const remaining = Math.round(window.remainingPercent);
  return `${window.label} ${remaining}%`;
}

export function extractAccountId(accessToken: string): string | undefined {
  try {
    const payloadPart = accessToken.split(".")[1];
    if (!payloadPart) return undefined;

    const payload = AccountPayloadSchema.safeParse(
      JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")),
    );
    return payload.success
      ? payload.data[OPENAI_AUTH_CLAIM].chatgpt_account_id
      : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchUsage(
  accessToken: string,
  options: FetchUsageOptions = {},
): Promise<UsageSnapshot> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "pi-openai-usage",
  };
  const accountId = extractAccountId(accessToken);
  if (accountId) headers["ChatGPT-Account-Id"] = accountId;

  const response = await fetchImplementation(
    "https://chatgpt.com/backend-api/wham/usage",
    { headers, signal: options.signal },
  );
  if (!response.ok) {
    throw new Error(`OpenAI usage request failed with HTTP ${response.status}`);
  }

  return parseUsagePayload(await response.json());
}
