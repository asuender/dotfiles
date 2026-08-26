const OPENAI_AUTH_CLAIM = "https://api.openai.com/auth";

type JsonObject = Record<string, unknown>;

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

function asObject(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function shortLimitName(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;

  const name = value.trim();
  const codexSuffix = name.match(/codex[-_\s]+(.+)$/i)?.[1];
  return (codexSuffix ?? name).replace(/[-_]+/g, " ");
}

function parseWindow(
  value: unknown,
  id: string,
  limitName?: string,
): UsageWindow | undefined {
  const object = asObject(value);
  if (!object) return undefined;

  const usedPercent = finiteNumber(object.used_percent);
  const durationSeconds = finiteNumber(object.limit_window_seconds);
  if (usedPercent === undefined || durationSeconds === undefined || durationSeconds <= 0) {
    return undefined;
  }

  const resetSeconds = finiteNumber(object.reset_at);
  const durationLabel = formatDuration(durationSeconds);

  return {
    id,
    label: limitName ? `${limitName} ${durationLabel}` : durationLabel,
    remainingPercent: clamp(100 - usedPercent, 0, 100),
    durationSeconds,
    ...(resetSeconds !== undefined && resetSeconds > 0
      ? { resetsAt: resetSeconds * 1000 }
      : {}),
  };
}

function parseRateLimit(
  value: unknown,
  idPrefix: string,
  limitName?: string,
): UsageWindow[] {
  const rateLimit = asObject(value);
  if (!rateLimit) return [];

  return [
    parseWindow(rateLimit.primary_window, `${idPrefix}:primary`, limitName),
    parseWindow(rateLimit.secondary_window, `${idPrefix}:secondary`, limitName),
  ].filter((window): window is UsageWindow => window !== undefined);
}

export function parseUsagePayload(payload: unknown): UsageSnapshot {
  const object = asObject(payload);
  if (!object) throw new Error("OpenAI usage response must be an object");

  const windows = parseRateLimit(object.rate_limit, "default");
  if (Array.isArray(object.additional_rate_limits)) {
    object.additional_rate_limits.forEach((entry, index) => {
      const additional = asObject(entry);
      if (!additional) return;

      windows.push(
        ...parseRateLimit(
          additional.rate_limit,
          `additional:${index}`,
          shortLimitName(additional.limit_name),
        ),
      );
    });
  }

  if (windows.length === 0) {
    throw new Error("OpenAI usage response contained no rate-limit windows");
  }

  return {
    ...(typeof object.plan_type === "string" ? { planType: object.plan_type } : {}),
    windows,
  };
}

export function formatDuration(seconds: number): string {
  if (seconds % 604_800 === 0) return `${seconds / 604_800}w`;
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

    const payload = asObject(
      JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")),
    );
    const auth = asObject(payload?.[OPENAI_AUTH_CLAIM]);
    const accountId = auth?.chatgpt_account_id;
    return typeof accountId === "string" && accountId ? accountId : undefined;
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
