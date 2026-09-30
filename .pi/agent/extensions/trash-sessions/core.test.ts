import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  AGE_COMPLETIONS,
  completeAge,
  cutoffFromAge,
  parseAge,
  parseCommandArgs,
  selectStaleSessions,
  summarizeTrashResults,
  trashSessionFile,
  USAGE,
  type SpawnResult,
  type TrashDeps,
  type TrashResult,
} from "./core.ts";

const NOW = Date.parse("2026-09-19T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("parseAge", () => {
  test("parses month and year shortcuts", () => {
    const month = parseAge("1 mo");
    assert.equal(month.ok, true);
    if (month.ok) assert.equal(month.value.ms, 30 * DAY_MS);

    const year = parseAge("2 yrs");
    assert.equal(year.ok, true);
    if (year.ok) {
      assert.equal(year.value.count, 2);
      assert.equal(year.value.unit, "yrs");
      assert.equal(year.value.ms, 2 * 365 * DAY_MS);
    }
  });

  test("allows a missing space between count and unit", () => {
    const age = parseAge("1mo");
    assert.equal(age.ok, true);
    if (age.ok) assert.equal(age.value.ms, 30 * DAY_MS);
  });

  test("treats m as minutes and mo as months", () => {
    const minutes = parseAge("30 m");
    const months = parseAge("1 month");
    assert.equal(minutes.ok, true);
    assert.equal(months.ok, true);
    if (minutes.ok) assert.equal(minutes.value.ms, 30 * 60_000);
    if (months.ok) assert.equal(months.value.ms, 30 * DAY_MS);
  });

  for (const input of ["", "1", "0 mo", "foo", "1 lightyear"]) {
    test(`rejects ${JSON.stringify(input)}`, () => {
      assert.deepEqual(parseAge(input), { ok: false, error: USAGE });
    });
  }
});

describe("parseCommandArgs", () => {
  test("defaults to the current project", () => {
    const parsed = parseCommandArgs(" 1 mo ");
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.scope, "cwd");
      assert.equal(parsed.value.age.input, "1 mo");
    }
  });

  test("accepts an all-projects scope", () => {
    const parsed = parseCommandArgs("ALL 2 yrs");
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.scope, "all");
      assert.equal(parsed.value.age.unit, "yrs");
    }
  });

  test("requires an age after all", () => {
    assert.deepEqual(parseCommandArgs("all"), { ok: false, error: USAGE });
    assert.deepEqual(parseCommandArgs(""), { ok: false, error: USAGE });
  });
});

describe("selectStaleSessions", () => {
  const cutoff = cutoffFromAge({ input: "1 mo", count: 1, unit: "mo", ms: 30 * DAY_MS }, NOW);

  test("keeps sessions last used before the cutoff and skips the active session", () => {
    const stale = selectStaleSessions(
      [
        { path: "/old.jsonl", modified: new Date(NOW - 40 * DAY_MS) },
        { path: "/edge.jsonl", modified: new Date(cutoff.getTime()) },
        { path: "/new.jsonl", modified: new Date(NOW - DAY_MS) },
        { path: "/current.jsonl", modified: new Date(NOW - 40 * DAY_MS) },
      ],
      { cutoff, currentPath: "/current.jsonl" },
    );

    assert.deepEqual(
      stale.map((session) => session.path),
      ["/old.jsonl"],
    );
  });
});

describe("completeAge", () => {
  test("filters suggestions by prefix", () => {
    assert.deepEqual(
      completeAge("1").map((item) => item.value),
      ["1 mo", "1 yr"],
    );
    assert.deepEqual(
      completeAge("all ").map((item) => item.value),
      ["all 1 mo", "all 1 yr"],
    );
    assert.equal(AGE_COMPLETIONS.includes("2 yrs"), true);
  });
});

describe("trashSessionFile", () => {
  test("uses trash when the CLI succeeds", async () => {
    const result = await trashSessionFile("/session.jsonl", deps({ status: 0 }));
    assert.deepEqual(result, { ok: true, method: "trash" });
  });

  test("treats a vanished file as a successful trash", async () => {
    const result = await trashSessionFile("/session.jsonl", deps({ status: 1, exists: false }));
    assert.deepEqual(result, { ok: true, method: "trash" });
  });

  test("falls back to unlink when trash leaves the file", async () => {
    const unlinked: string[] = [];
    const result = await trashSessionFile(
      "/session.jsonl",
      deps({
        status: 1,
        stderr: "trash: not found",
        exists: true,
        unlink: async (path) => {
          unlinked.push(path);
        },
      }),
    );
    assert.deepEqual(result, { ok: true, method: "unlink" });
    assert.deepEqual(unlinked, ["/session.jsonl"]);
  });

  test("includes the trash hint when both methods fail", async () => {
    const result = await trashSessionFile(
      "/session.jsonl",
      deps({
        status: 1,
        error: new Error("spawn trash ENOENT"),
        exists: true,
        unlink: async () => {
          throw new Error("EPERM");
        },
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /EPERM/);
      assert.match(result.error, /spawn trash ENOENT/);
    }
  });

  test("passes -- before paths that start with a dash", async () => {
    const args: string[][] = [];
    await trashSessionFile(
      "-odd.jsonl",
      deps({
        status: 0,
        spawn: (_command, spawnArgs) => {
          args.push([...spawnArgs]);
          return { status: 0, stderr: "" };
        },
      }),
    );
    assert.deepEqual(args, [["--", "-odd.jsonl"]]);
  });
});

describe("summarizeTrashResults", () => {
  test("describes mixed outcomes", () => {
    const results: TrashResult[] = [
      { ok: true, method: "trash" },
      { ok: true, method: "trash" },
      { ok: true, method: "unlink" },
      { ok: false, method: "unlink", error: "EPERM" },
    ];
    const summary = summarizeTrashResults(results);
    assert.equal(summary.message, "2 moved to trash; 1 deleted; 1 failed");
    assert.equal(summary.level, "warning");
  });
});

function deps(options: {
  status?: number | null;
  error?: Error;
  stderr?: string;
  exists?: boolean;
  unlink?: (path: string) => Promise<void>;
  spawn?: TrashDeps["spawnSync"];
}): TrashDeps {
  const spawnResult: SpawnResult = {
    status: options.status ?? 1,
    error: options.error,
    stderr: options.stderr ?? "",
  };
  return {
    spawnSync:
      options.spawn ??
      ((_command, _args) => spawnResult),
    existsSync: () => options.exists ?? false,
    unlink: options.unlink ?? (async () => undefined),
  };
}
