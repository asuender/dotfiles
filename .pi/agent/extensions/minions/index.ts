import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir, ModelRuntime } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { getFinalOutput, loadConfig, runMinion, type MinionProgress } from "./core.ts";

const OUTPUT_LIMIT_BYTES = 50 * 1024;
const TOOL_INDENT = 1;

let modelRuntimePromise: Promise<ModelRuntime> | undefined;

function getModelRuntime(): Promise<ModelRuntime> {
  return (modelRuntimePromise ??= ModelRuntime.create());
}

type MinionDetails = MinionProgress & { task: string; model: string; running: boolean };

function oneLine(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function truncate(value: string, max = 90): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function formatTokens(count: number): string {
  if (count < 1_000) return String(count);
  if (count < 10_000) return `${(count / 1_000).toFixed(1)}k`;
  if (count < 1_000_000) return `${Math.round(count / 1_000)}k`;
  return `${(count / 1_000_000).toFixed(1)}m`;
}

export function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, Math.round(durationMs / 1_000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function formatMinionTitle(args: { task: string; title?: string }): string {
  return truncate(oneLine(args.title?.trim() || args.task));
}

function truncateOutput(output: string): string {
  if (Buffer.byteLength(output, "utf8") <= OUTPUT_LIMIT_BYTES) return output;
  let value = output.slice(0, OUTPUT_LIMIT_BYTES);
  while (Buffer.byteLength(value, "utf8") > OUTPUT_LIMIT_BYTES) value = value.slice(0, -1);
  return `${value}\n\n[Output truncated. Full result remains available in the expanded tool details.]`;
}

export function formatRunningProgress(details: MinionProgress): string {
  const toolCalls = details.messages.reduce((count, message) => {
    if (message.role !== "assistant") return count;
    return count + message.content.filter((part) => part.type === "toolCall").length;
  }, 0);
  const callSummary = toolCalls ? ` · ${toolCalls} tool ${toolCalls === 1 ? "call" : "calls"}` : "";
  const output = getFinalOutput(details.messages);
  const responseSummary = output ? ` · "${truncate(oneLine(output), 90)}"` : "";
  return `running${callSummary}${responseSummary}`;
}

function summarizeToolArguments(args: unknown): string {
  if (!args || typeof args !== "object" || Array.isArray(args)) return "";
  const values = args as Record<string, unknown>;
  for (const key of ["path", "command", "pattern", "query", "url"]) {
    if (typeof values[key] === "string") return truncate(oneLine(values[key]), 100);
  }
  const firstString = Object.values(values).find((value): value is string => typeof value === "string");
  return firstString ? truncate(oneLine(firstString), 100) : "";
}

export function formatExpandedProgress(details: MinionProgress): string {
  const lines: string[] = [];
  for (const message of details.messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.content) {
      if (part.type === "text" && part.text.trim()) {
        lines.push(`"${truncate(oneLine(part.text), 240)}"`);
      } else if (part.type === "toolCall") {
        const summary = summarizeToolArguments(part.arguments);
        lines.push(`↳ ${part.name}${summary ? ` ${summary}` : ""}`);
      }
    }
  }
  return lines.join("\n");
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "minion",
    label: "Minion",
    renderShell: "self",
    description: "Delegate one focused repository task to an isolated Pi subprocess using the configured inexpensive model. The minion can inspect, edit, and verify code, but cannot delegate further.",
    promptSnippet: "Delegate a focused implementation, exploration, or verification task to an isolated minion",
    promptGuidelines: [
      "Use minion when the user asks to use minions or when the loaded minions skill directs delegation.",
      "Give minion a short descriptive title and a self-contained brief with the goal, constraints, known context, and expected output.",
      "After minion returns, synthesize its result and perform only targeted verification when necessary.",
    ],
    parameters: Type.Object({
      title: Type.Optional(Type.String({ description: "Short descriptive title shown in the tool call" })),
      task: Type.String({ description: "Clear, self-contained task for the minion" }),
      cwd: Type.Optional(Type.String({ description: "Working directory, relative to the current project or absolute" })),
    }),

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const configPath = path.join(getAgentDir(), "minions.json");
      const config = loadConfig(configPath);
      const cwd = params.cwd ? path.resolve(ctx.cwd, params.cwd) : ctx.cwd;
      const result = await runMinion({
        task: params.task,
        cwd,
        config,
        modelRuntime: await getModelRuntime(),
        signal,
        onProgress(progress) {
          onUpdate?.({
            content: [{ type: "text", text: progress.finalOutput || "Minion is working..." }],
            details: { ...progress, task: params.task, model: config.model, running: true },
          });
        },
      });

      return {
        content: [{ type: "text", text: truncateOutput(result.finalOutput) }],
        details: { ...result, task: params.task, model: config.model, running: false },
        usage: result.usage,
      };
    },

    renderCall(args, theme, context) {
      if (!context.argsComplete && context.isPartial) {
        return new Text(theme.fg("dim", "minion …"), TOOL_INDENT, 0);
      }
      const title = context.isError
        ? theme.fg("error", theme.bold("✗ minion"))
        : theme.fg("toolTitle", theme.bold("minion"));
      return new Text(`${title} ${theme.fg("accent", formatMinionTitle(args))}`, TOOL_INDENT, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      const details = result.details as MinionDetails | undefined;
      if (!details) {
        const content = result.content[0];
        const text = content?.type === "text" ? content.text.trim() : "";
        return new Text(text ? theme.fg("error", ` → ${truncate(oneLine(text), 160)}`) : "", TOOL_INDENT, 0);
      }

      const output = details.finalOutput || getFinalOutput(details.messages);
      const running = isPartial || details.running;
      if (expanded && running) {
        const progress = formatExpandedProgress(details);
        if (progress) return new Text(`\n${theme.fg("toolOutput", progress)}`, TOOL_INDENT, 0);
      }
      if (expanded && output) {
        return new Text(`\n${theme.fg("toolOutput", output.trim())}`, TOOL_INDENT, 0);
      }

      const status = details.phase === "retrying"
        ? theme.fg("warning", "retrying")
        : running
          ? theme.fg("warning", formatRunningProgress(details))
          : theme.fg("success", "completed");
      const input = details.usage.input + details.usage.cacheRead;
      const stats = running
        ? ""
        : theme.fg(
            "dim",
            ` · ${formatDuration(details.durationMs)} · ${formatTokens(input)} in · ${formatTokens(details.usage.output)} out · $${details.usage.cost.total.toFixed(4)}`,
          );
      return new Text(` ${theme.fg("muted", "→")} ${status}${stats}`, TOOL_INDENT, 0);
    },
  });
}
