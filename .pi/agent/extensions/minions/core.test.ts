import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { DEFAULT_CONFIG, getFinalOutput, loadConfig, MINION_SYSTEM_PROMPT, parseConfig } from "./core.ts";
import { formatDuration } from "./index.ts";

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

test.each([
  [400, "0s"],
  [1_400, "1s"],
  [60_000, "1m"],
  [125_000, "2m 5s"],
])("formatDuration formats %i ms as %s", (durationMs, expected) => {
  expect(formatDuration(durationMs)).toBe(expected);
});

test("getFinalOutput returns the latest assistant text", () => {
  expect(
    getFinalOutput([
      { role: "assistant", content: [{ type: "text", text: "first" }], timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "last" }], timestamp: 2 },
    ] as never),
  ).toBe("last");
});
