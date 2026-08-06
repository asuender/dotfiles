/**
 * Project references (OpenCode-style, path-only).
 *
 * Reads ~/.pi/agent/references.json on session start/reload, appends described
 * references to the system prompt, and offers @alias fuzzy autocomplete
 * (alias names only — not files inside the reference).
 */

import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  type AutocompleteItem,
  type AutocompleteProvider,
  type AutocompleteSuggestions,
  fuzzyFilter,
} from "@earendil-works/pi-tui";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { readFileSync, existsSync, statSync } from "node:fs";

const MAX_SUGGESTIONS = 20;
const ALIAS_PATTERN = /^[^/\s`,]+$/;

type ReferenceEntry = {
  alias: string;
  path: string;
  description?: string;
  hidden: boolean;
};

type LoadResult =
  | { ok: true; entries: ReferenceEntry[] }
  | { ok: false; error: string; entries: ReferenceEntry[] };

function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

function shortenPath(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

function isAliasValid(alias: string): boolean {
  return alias.length > 0 && ALIAS_PATTERN.test(alias);
}

function isExistingDirectory(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function parseReferencesFile(raw: string, configDir: string): LoadResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "references: failed to parse references.json", entries: [] };
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "references: references.json must be a JSON object", entries: [] };
  }

  const entries: ReferenceEntry[] = [];
  const errors: string[] = [];

  for (const [alias, value] of Object.entries(data as Record<string, unknown>)) {
    if (alias === "$schema") continue;

    if (!isAliasValid(alias)) {
      errors.push(`invalid alias "${alias}"`);
      continue;
    }

    let pathValue: string | undefined;
    let description: string | undefined;
    let hidden = false;

    if (typeof value === "string") {
      pathValue = value;
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if (typeof obj.path !== "string" || !obj.path.trim()) {
        errors.push(`"${alias}" is missing a non-empty path`);
        continue;
      }
      pathValue = obj.path;
      if (obj.description !== undefined) {
        if (typeof obj.description !== "string") {
          errors.push(`"${alias}" description must be a string`);
          continue;
        }
        description = obj.description.trim() || undefined;
      }
      if (obj.hidden !== undefined) {
        if (typeof obj.hidden !== "boolean") {
          errors.push(`"${alias}" hidden must be a boolean`);
          continue;
        }
        hidden = obj.hidden;
      }
      const unknownKeys = Object.keys(obj).filter((k) => !["path", "description", "hidden"].includes(k));
      if (unknownKeys.length > 0) {
        errors.push(`"${alias}" has unknown fields: ${unknownKeys.join(", ")}`);
        continue;
      }
    } else {
      errors.push(`"${alias}" must be a path string or object`);
      continue;
    }

    const expanded = expandHome(pathValue.trim());
    const resolved = isAbsolute(expanded) ? expanded : resolve(configDir, expanded);

    if (!isExistingDirectory(resolved)) {
      continue;
    }

    entries.push({
      alias,
      path: resolved,
      description,
      hidden,
    });
  }

  if (errors.length > 0) {
    return {
      ok: false,
      error: `references: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? ` (+${errors.length - 3} more)` : ""}`,
      entries: [],
    };
  }

  return { ok: true, entries };
}

function loadReferences(): LoadResult {
  const configDir = getAgentDir();
  const configPath = join(configDir, "references.json");

  if (!existsSync(configPath)) {
    return { ok: true, entries: [] };
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `references: failed to read references.json: ${message}`, entries: [] };
  }

  return parseReferencesFile(raw, configDir);
}

function buildPromptSection(entries: ReferenceEntry[]): string | undefined {
  const described = entries.filter((e) => e.description);
  if (described.length === 0) return undefined;

  const lines = described.map((e) => `- ${e.alias}: ${e.path}\n  ${e.description}`);
  return `
## Project References

${lines.join("\n")}

Use these absolute paths with read/bash/grep when a reference is relevant.
`;
}

function extractAtAliasToken(textBeforeCursor: string): string | undefined {
  // Match @alias at a token boundary; reject tokens that already contain "/"
  // so @alias/path falls through to built-in file completion.
  const match = textBeforeCursor.match(/(?:^|[ \t])@([^\s@/]*)$/);
  return match?.[1];
}

function formatItem(entry: ReferenceEntry): AutocompleteItem {
  return {
    value: entry.path,
    label: entry.alias,
    description: entry.description ? truncate(entry.description, 60) : shortenPath(entry.path),
  };
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function filterReferences(entries: ReferenceEntry[], query: string): AutocompleteItem[] {
  const visible = entries.filter((e) => !e.hidden);
  if (visible.length === 0) return [];

  if (!query.trim()) {
    return visible.slice(0, MAX_SUGGESTIONS).map(formatItem);
  }

  return fuzzyFilter(visible, query, (e) => `${e.alias} ${e.description ?? ""}`)
    .slice(0, MAX_SUGGESTIONS)
    .map(formatItem);
}

function createReferencesAutocompleteProvider(
  current: AutocompleteProvider,
  getEntries: () => ReferenceEntry[],
): AutocompleteProvider {
  return {
    triggerCharacters: current.triggerCharacters,
    async getSuggestions(lines, cursorLine, cursorCol, options): Promise<AutocompleteSuggestions | null> {
      const currentLine = lines[cursorLine] ?? "";
      const textBeforeCursor = currentLine.slice(0, cursorCol);
      const token = extractAtAliasToken(textBeforeCursor);

      // Bare "@" keeps built-in file completion; only claim when an alias query is present.
      if (token === undefined || token.length === 0) {
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      }

      const suggestions = filterReferences(getEntries(), token);
      if (options.signal.aborted || suggestions.length === 0) {
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      }

      return {
        items: suggestions,
        prefix: `@${token}`,
      };
    },

    applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
      return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
    },

    shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
      return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
    },
  };
}

export default function (pi: ExtensionAPI) {
  let entries: ReferenceEntry[] = [];

  pi.on("session_start", async (_event, ctx) => {
    const result = loadReferences();
    entries = result.entries;

    if (!result.ok) {
      ctx.ui.notify(result.error, "error");
    }

    ctx.ui.addAutocompleteProvider((current) =>
      createReferencesAutocompleteProvider(current, () => entries),
    );
  });

  pi.on("before_agent_start", async (event) => {
    const section = buildPromptSection(entries);
    if (!section) return;

    return {
      systemPrompt: `${event.systemPrompt}${section}`,
    };
  });
}
