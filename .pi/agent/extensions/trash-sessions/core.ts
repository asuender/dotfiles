import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

const UNIT_MS: Record<string, number> = {
  m: MINUTE_MS,
  min: MINUTE_MS,
  mins: MINUTE_MS,
  minute: MINUTE_MS,
  minutes: MINUTE_MS,
  h: HOUR_MS,
  hr: HOUR_MS,
  hrs: HOUR_MS,
  hour: HOUR_MS,
  hours: HOUR_MS,
  d: DAY_MS,
  day: DAY_MS,
  days: DAY_MS,
  w: WEEK_MS,
  wk: WEEK_MS,
  wks: WEEK_MS,
  week: WEEK_MS,
  weeks: WEEK_MS,
  mo: MONTH_MS,
  mos: MONTH_MS,
  month: MONTH_MS,
  months: MONTH_MS,
  y: YEAR_MS,
  yr: YEAR_MS,
  yrs: YEAR_MS,
  year: YEAR_MS,
  years: YEAR_MS,
};

export const USAGE = "Usage: /trash-sessions [all] <n> <unit> (examples: 1 mo, 2 yrs)";

const AGE_PATTERN = /^(\d+)\s*([a-z]+)$/i;

export type ParsedAge = {
  input: string;
  count: number;
  unit: string;
  ms: number;
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type CommandArgs = {
  scope: "cwd" | "all";
  age: ParsedAge;
};

export type SessionLike = {
  path: string;
  modified: Date;
};

export type SpawnResult = {
  status: number | null;
  error?: Error;
  stderr?: string | null;
};

export type TrashDeps = {
  spawnSync: (command: string, args: readonly string[], options: { encoding: "utf-8" }) => SpawnResult;
  existsSync: (path: string) => boolean;
  unlink: (path: string) => Promise<void>;
};

export type TrashResult =
  | { ok: true; method: "trash" | "unlink" }
  | { ok: false; method: "unlink"; error: string };

const defaultTrashDeps: TrashDeps = {
  spawnSync(command, args, options) {
    const result = spawnSync(command, [...args], options);
    return {
      status: result.status,
      error: result.error,
      stderr: typeof result.stderr === "string" ? result.stderr : undefined,
    };
  },
  existsSync,
  unlink,
};

export function parseAge(raw: string): ParseResult<ParsedAge> {
  const input = raw.trim();
  const match = input.match(AGE_PATTERN);
  if (!match) return { ok: false, error: USAGE };

  const count = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  const ms = UNIT_MS[unit];
  if (!Number.isInteger(count) || count < 1 || ms === undefined) {
    return { ok: false, error: USAGE };
  }

  return { ok: true, value: { input, count, unit, ms: count * ms } };
}

export function parseCommandArgs(raw: string): ParseResult<CommandArgs> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: USAGE };

  const allMatch = trimmed.match(/^all(?:\s+(.*))?$/i);
  if (allMatch) {
    const rest = allMatch[1]?.trim() ?? "";
    if (!rest) return { ok: false, error: USAGE };
    const age = parseAge(rest);
    if (!age.ok) return age;
    return { ok: true, value: { scope: "all", age: age.value } };
  }

  const age = parseAge(trimmed);
  if (!age.ok) return age;
  return { ok: true, value: { scope: "cwd", age: age.value } };
}

export function cutoffFromAge(age: ParsedAge, now = Date.now()): Date {
  return new Date(now - age.ms);
}

export function selectStaleSessions<T extends SessionLike>(
  sessions: T[],
  options: { cutoff: Date; currentPath?: string },
): T[] {
  return sessions.filter((session) => {
    if (options.currentPath && session.path === options.currentPath) return false;
    return session.modified.getTime() < options.cutoff.getTime();
  });
}

export const AGE_COMPLETIONS = ["1 mo", "3 mo", "6 mo", "1 yr", "2 yrs", "all 1 mo", "all 1 yr"];

export function completeAge(prefix: string): Array<{ value: string; label: string }> {
  const query = prefix.trim().toLowerCase();
  return AGE_COMPLETIONS.filter((value) => value.startsWith(query)).map((value) => ({ value, label: value }));
}

function trashErrorHint(result: SpawnResult): string | undefined {
  const parts: string[] = [];
  if (result.error) parts.push(result.error.message);
  const stderr = result.stderr?.trim();
  if (stderr) parts.push(stderr.split("\n")[0] ?? stderr);
  if (parts.length === 0) return undefined;
  return `trash: ${parts.join(" · ").slice(0, 200)}`;
}

export async function trashSessionFile(sessionPath: string, deps: TrashDeps = defaultTrashDeps): Promise<TrashResult> {
  const trashArgs = sessionPath.startsWith("-") ? ["--", sessionPath] : [sessionPath];
  const trashResult = deps.spawnSync("trash", trashArgs, { encoding: "utf-8" });

  if (trashResult.status === 0 || !deps.existsSync(sessionPath)) {
    return { ok: true, method: "trash" };
  }

  try {
    await deps.unlink(sessionPath);
    return { ok: true, method: "unlink" };
  } catch (err) {
    const unlinkError = err instanceof Error ? err.message : String(err);
    const hint = trashErrorHint(trashResult);
    return {
      ok: false,
      method: "unlink",
      error: hint ? `${unlinkError} (${hint})` : unlinkError,
    };
  }
}

export function summarizeTrashResults(
  results: TrashResult[],
): { removed: number; trashed: number; unlinked: number; failed: number; message: string; level: "info" | "warning" | "error" } {
  let trashed = 0;
  let unlinked = 0;
  let failed = 0;

  for (const result of results) {
    if (!result.ok) {
      failed++;
      continue;
    }
    if (result.method === "trash") trashed++;
    else unlinked++;
  }

  const removed = trashed + unlinked;
  const parts: string[] = [];
  if (trashed) parts.push(`${trashed} moved to trash`);
  if (unlinked) parts.push(`${unlinked} deleted`);
  if (failed) parts.push(`${failed} failed`);

  const level = failed ? (removed ? "warning" : "error") : "info";
  return {
    removed,
    trashed,
    unlinked,
    failed,
    message: parts.join("; ") || "No sessions removed",
    level,
  };
}
