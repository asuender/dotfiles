import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  extractAccountId,
  fetchUsage,
  formatDuration,
  formatUsageWindow,
  parseUsagePayload,
} from "./core.ts";

function tokenFor(accountId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      "https://api.openai.com/auth": {
        chatgpt_account_id: accountId,
      },
    }),
  ).toString("base64url");
  return `header.${payload}.signature`;
}

describe("parseUsagePayload", () => {
  test("converts used percentages into remaining percentages", () => {
    const snapshot = parseUsagePayload({
      plan_type: "plus",
      rate_limit: {
        primary_window: {
          used_percent: 17.5,
          limit_window_seconds: 18_000,
          reset_at: 1_800_000_000,
        },
        secondary_window: {
          used_percent: 40,
          limit_window_seconds: 604_800,
          reset_at: 1_800_100_000,
        },
      },
    });

    assert.equal(snapshot.planType, "plus");
    assert.deepEqual(
      snapshot.windows.map((window) => ({
        label: window.label,
        remainingPercent: window.remainingPercent,
      })),
      [
        { label: "5h", remainingPercent: 82.5 },
        { label: "7d", remainingPercent: 60 },
      ],
    );
    assert.equal(snapshot.windows[0]?.resetsAt, 1_800_000_000_000);
  });

  test("parses and labels additional model limits", () => {
    const snapshot = parseUsagePayload({
      rate_limit: {
        primary_window: {
          used_percent: -5,
          limit_window_seconds: 18_000,
        },
      },
      additional_rate_limits: [
        {
          limit_name: "GPT-5.3-Codex-Spark",
          rate_limit: {
            secondary_window: {
              used_percent: 110,
              limit_window_seconds: 604_800,
            },
          },
        },
      ],
    });

    assert.equal(formatUsageWindow(snapshot.windows[0]!), "5h 100%");
    assert.equal(formatUsageWindow(snapshot.windows[1]!), "Spark 7d 0%");
  });

  test("rejects responses without usable windows", () => {
    assert.throws(
      () => parseUsagePayload({ rate_limit: { primary_window: null } }),
      /no rate-limit windows/,
    );
  });
});

describe("formatDuration", () => {
  test("derives labels from the returned duration", () => {
    assert.equal(formatDuration(300), "5m");
    assert.equal(formatDuration(18_000), "5h");
    assert.equal(formatDuration(86_400), "1d");
    assert.equal(formatDuration(604_800), "7d");
  });
});

describe("OpenAI authentication", () => {
  test("extracts the ChatGPT account ID from an OAuth token", () => {
    assert.equal(extractAccountId(tokenFor("account-123")), "account-123");
    assert.equal(extractAccountId("not-a-jwt"), undefined);
  });

  test("sends bearer and account headers to the usage endpoint", async () => {
    const token = tokenFor("account-456");
    let requestedUrl: string | undefined;
    let requestedHeaders: Headers | undefined;

    const snapshot = await fetchUsage(token, {
      fetch: async (input, init) => {
        requestedUrl = input.toString();
        requestedHeaders = new Headers(init?.headers);
        return new Response(
          JSON.stringify({
            rate_limit: {
              primary_window: {
                used_percent: 25,
                limit_window_seconds: 18_000,
              },
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    });

    assert.equal(
      requestedUrl,
      "https://chatgpt.com/backend-api/wham/usage",
    );
    assert.equal(requestedHeaders?.get("Authorization"), `Bearer ${token}`);
    assert.equal(requestedHeaders?.get("ChatGPT-Account-Id"), "account-456");
    assert.equal(snapshot.windows[0]?.remainingPercent, 75);
  });

  test("does not expose response bodies in HTTP errors", async () => {
    await assert.rejects(
      fetchUsage(tokenFor("account-789"), {
        fetch: async () => new Response("sensitive", { status: 401 }),
      }),
      /HTTP 401/,
    );
  });
});
