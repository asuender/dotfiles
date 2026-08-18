import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { DEFAULT_CONFIG, getFinalOutput, getRetryDelay, loadConfig, MINION_SYSTEM_PROMPT, parseConfig } from "./core.ts";
import { formatDuration, formatExpandedProgress, formatMinionTitle, formatRunningProgress } from "./index.ts";

describe("parseConfig", () => {
  test("uses defaults", () => {
    expect(parseConfig({})).toEqual(DEFAULT_CONFIG);
  });

  test("accepts a custom model, thinking level, and tools", () => {
    expect(parseConfig({ model: "provider/model", thinking: "medium", tools: ["read"] })).toEqual({
      model: "provider/model",
      thinking: "medium",
      tools: ["read"],
    });
  });

  test.each([
    [{ model: "missing-provider" }, "provider/model"],
    [{ thinking: "huge" }, "thinking level"],
    [{ tools: [] }, "non-empty string array"],
  ])("rejects invalid config %#", (config, message) => {
    expect(() => parseConfig(config)).toThrow(message);
  });
});

describe("loadConfig", () => {
  test("reports malformed JSON with its path", () => {
    const dir = mkdtempSync(join(tmpdir(), "minions-test-"));
    const file = join(dir, "minions.json");
    writeFileSync(file, "{");
    expect(() => loadConfig(file)).toThrow(`Invalid JSON in ${file}`);
  });
});

test("the minion prompt prevents recursive delegation", () => {
  expect(MINION_SYSTEM_PROMPT).toContain("Do not delegate to subagents or invoke minions");
});

describe("getRetryDelay", () => {
  test("uses exponential backoff with full jitter", () => {
    expect(getRetryDelay(0, () => 1)).toBe(2_000);
    expect(getRetryDelay(1, () => 1)).toBe(4_000);
    expect(getRetryDelay(2, () => 0.5)).toBe(4_000);
  });

  test("caps the delay", () => {
    expect(getRetryDelay(10, () => 1)).toBe(30_000);
  });
});

test.each([
  [400, "0s"],
  [1_400, "1s"],
  [60_000, "1m"],
  [125_000, "2m 5s"],
])("formatDuration formats %i ms as %s", (durationMs, expected) => {
  expect(formatDuration(durationMs)).toBe(expected);
});

test("formatMinionTitle prefers the title and falls back to the task", () => {
  expect(formatMinionTitle({ title: "Inspect auth flow", task: "A long detailed prompt" })).toBe("Inspect auth flow");
  expect(formatMinionTitle({ task: "Fallback prompt" })).toBe("Fallback prompt");
  expect(formatMinionTitle({ title: "  ", task: "Fallback prompt" })).toBe("Fallback prompt");
});

test("getFinalOutput returns the latest assistant text", () => {
  expect(
    getFinalOutput([
      { role: "assistant", content: [{ type: "text", text: "first" }], timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "last" }], timestamp: 2 },
    ] as never),
  ).toBe("last");
});

const runningProgress = {
  messages: [
    {
      role: "assistant",
      content: [
        { type: "text", text: "I found the likely issue.\nChecking the tests now." },
        { type: "toolCall", id: "1", name: "read", arguments: { path: "src/auth/session.ts" } },
      ],
      timestamp: 1,
    },
    {
      role: "assistant",
      content: [{ type: "toolCall", id: "2", name: "bash", arguments: { command: "npm test -- auth" } }],
      timestamp: 2,
    },
  ],
  finalOutput: "",
  usage: {} as never,
  durationMs: 1_000,
  phase: "running",
} as never;

test("formatRunningProgress summarizes tool calls and the latest response", () => {
  expect(formatRunningProgress(runningProgress)).toBe(
    'running · 2 tool calls · "I found the likely issue. Checking the tests now."',
  );
});

test("formatExpandedProgress shows responses and concise tool calls", () => {
  expect(formatExpandedProgress(runningProgress)).toBe(
    '"I found the likely issue. Checking the tests now."\n↳ read src/auth/session.ts\n↳ bash npm test -- auth',
  );
});
