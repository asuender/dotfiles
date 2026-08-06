/**
 * Quiet Minimal Mode
 *
 * - quiet tool-call rendering while args stream
 * - minimal collapsed result rendering (ctrl+o expands full output)
 *
 * Note: pi-web-access and pi-fff package extensions are disabled in settings.json
 * and registered here so renderer overrides do not conflict across extensions.
 */

import type { ExtensionAPI, ToolRenderContext } from "@earendil-works/pi-coding-agent";
import webAccessExtension from "../npm/node_modules/pi-web-access/index.ts";
import fffExtension from "../npm/node_modules/@ff-labs/pi-fff/src/index.ts";
import {
  createBashTool,
  createEditTool,
  createFindTool,
  createGrepTool,
  createLsTool,
  createReadTool,
  createWriteTool,
  renderDiff,
} from "@earendil-works/pi-coding-agent";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { homedir } from "node:os";

const TOOL_INDENT = 1;
type TextResult = { content: Array<{ type: string; text?: string }> };
type Nouns = [string, string];
type PackageTool = { name: string; renderShell?: "default" | "self";[key: string]: any };
type RenderCall = (args: any, theme: Theme, context: ToolRenderContext) => Text;

function shortenPath(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

function oneLine(value: unknown, fallback = "..."): string {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return text || fallback;
}

function truncate(value: string, max = 80): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function pending(name: string, theme: Theme, context: ToolRenderContext): Text | undefined {
  // Historical tool calls can have argsComplete=false; only hide live partial rows.
  return context.argsComplete || !context.isPartial ? undefined : new Text(theme.fg("dim", `${name} …`), TOOL_INDENT, 0);
}

function toolTitle(name: string, theme: Theme, context: ToolRenderContext): string {
  return context.isError ? theme.fg("error", theme.bold(`✗ ${name}`)) : theme.fg("toolTitle", theme.bold(name));
}

function textContent(result: TextResult): string {
  const text = result.content.find((c) => c.type === "text");
  return text?.type === "text" ? (text.text ?? "") : "";
}

function expandedText(result: TextResult, theme: Theme, isError = false): Text {
  const color = isError ? "error" : "toolOutput";
  const output = textContent(result)
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => theme.fg(color, line))
    .join("\n");
  return new Text(output ? `\n${output}` : "", TOOL_INDENT, 0);
}

function errorSummary(result: TextResult, theme: Theme): Text {
  const firstLine = textContent(result).trim().split("\n").find(Boolean) ?? "failed";
  return new Text(theme.fg("error", ` → ${truncate(firstLine, 160)}`), TOOL_INDENT, 0);
}

function countResult(result: TextResult, theme: Theme, nouns: Nouns): Text {
  const count = textContent(result).trim().split("\n").filter(Boolean).length;
  return new Text(count > 0 ? theme.fg("muted", ` → ${count} ${count === 1 ? nouns[0] : nouns[1]}`) : "", TOOL_INDENT, 0);
}

function renderToolResult(result: TextResult, expanded: boolean, theme: Theme, context: ToolRenderContext, nouns?: Nouns): Text {
  if (context.isError) return expanded ? expandedText(result, theme, true) : errorSummary(result, theme);
  if (expanded) return expandedText(result, theme);
  return nouns ? countResult(result, theme, nouns) : new Text("", TOOL_INDENT, 0);
}

function renderEditResult(result: TextResult & { details?: { diff?: unknown } }, theme: Theme, context: ToolRenderContext): Text {
  if (context.isError) return expandedText(result, theme, true);
  const diff = result.details?.diff;
  return typeof diff === "string" && diff.trim() ? new Text(`\n${renderDiff(diff)}`, TOOL_INDENT, 0) : new Text("", TOOL_INDENT, 0);
}

function call(name: string, render: (args: any, theme: Theme, context: ToolRenderContext) => string): RenderCall {
  return (args, theme, context) => pending(name, theme, context) ?? new Text(render(args, theme, context), TOOL_INDENT, 0);
}

function withTitle(name: string, theme: Theme, context: ToolRenderContext, body: string): string {
  return `${toolTitle(name, theme, context)} ${body}`;
}

function result(nouns?: Nouns) {
  return (toolResult: TextResult, { expanded }: any, theme: Theme, context: ToolRenderContext) => renderToolResult(toolResult, expanded, theme, context, nouns);
}

const builtInTools = new Map<string, ReturnType<typeof createBuiltInTools>>();
function createBuiltInTools(cwd: string) {
  return {
    read: createReadTool(cwd),
    bash: createBashTool(cwd),
    edit: createEditTool(cwd),
    write: createWriteTool(cwd),
    find: createFindTool(cwd),
    grep: createGrepTool(cwd),
    ls: createLsTool(cwd),
  };
}

function getBuiltInTools(cwd: string) {
  let tools = builtInTools.get(cwd);
  if (!tools) builtInTools.set(cwd, (tools = createBuiltInTools(cwd)));
  return tools;
}

function capturePackageTools(pi: ExtensionAPI, registerPackage: (api: ExtensionAPI) => void): Map<string, PackageTool> {
  const tools = new Map<string, PackageTool>();
  const noOp = () => undefined;
  const proxy = new Proxy(pi as any, {
    get(target, prop) {
      if (prop === "registerTool") return (tool: PackageTool) => tools.set(tool.name, tool);
      if (["on", "registerCommand", "registerShortcut", "registerMessageRenderer", "registerFlag"].includes(String(prop))) return noOp;
      return target[prop as keyof typeof target];
    },
  }) as ExtensionAPI;
  registerPackage(proxy);
  return tools;
}

function overridePackageTool(pi: ExtensionAPI, tool: PackageTool | undefined, renderCall: RenderCall, nouns?: Nouns) {
  if (!tool) return;
  pi.registerTool({ ...tool, renderShell: "self", renderCall, renderResult: result(nouns) } as any);
}

function registerPackageTools(pi: ExtensionAPI): void {
  const webTools = capturePackageTools(pi, webAccessExtension as any);
  const fffTools = capturePackageTools(pi, fffExtension as any);

  // Same extension owns package tools + overrides, avoiding cross-extension conflicts.
  webAccessExtension(pi);
  fffExtension(pi);

  overridePackageTool(
    pi,
    webTools.get("web_search"),
    call("search", (args, theme, context) => {
      const queries = Array.isArray(args.queries) ? args.queries : args.query ? [args.query] : [];
      const label = queries.length === 1 ? truncate(oneLine(queries[0]), 90) : `${queries.length || "..."} queries`;
      let text = withTitle("search", theme, context, theme.fg("accent", label));
      if (args.provider && args.provider !== "auto") text += theme.fg("toolOutput", ` via ${args.provider}`);
      if (args.includeContent) text += theme.fg("toolOutput", " +content");
      return text;
    }),
    ["result", "results"],
  );

  overridePackageTool(
    pi,
    webTools.get("fetch_content"),
    call("fetch", (args, theme, context) => {
      const urls = Array.isArray(args.urls) ? args.urls : args.url ? [args.url] : [];
      const label = urls.length === 1 ? truncate(oneLine(urls[0]), 90) : `${urls.length || "..."} urls`;
      let text = withTitle("fetch", theme, context, theme.fg("accent", label));
      if (args.timestamp) text += theme.fg("toolOutput", ` @ ${args.timestamp}`);
      if (args.frames) text += theme.fg("toolOutput", ` ${args.frames} frames`);
      return text;
    }),
    ["item", "items"],
  );

  overridePackageTool(
    pi,
    webTools.get("code_search"),
    call("code_search", (args, theme, context) => {
      let text = withTitle("code_search", theme, context, theme.fg("accent", truncate(oneLine(args.query), 90)));
      if (args.maxTokens !== undefined) text += theme.fg("toolOutput", ` max ${args.maxTokens}`);
      return text;
    }),
    ["result", "results"],
  );

  overridePackageTool(
    pi,
    webTools.get("get_search_content"),
    call("get_search_content", (args, theme, context) => {
      const selector = truncate(oneLine(args.query ?? args.url ?? (args.queryIndex !== undefined ? `query ${args.queryIndex}` : undefined) ?? (args.urlIndex !== undefined ? `url ${args.urlIndex}` : undefined) ?? "content"), 70);
      return withTitle("get_search_content", theme, context, `${theme.fg("accent", oneLine(args.responseId))}${theme.fg("toolOutput", ` ${selector}`)}`);
    }),
  );

  overridePackageTool(
    pi,
    fffTools.get("ffgrep"),
    call("ffgrep", (args, theme, context) => {
      let text = withTitle("ffgrep", theme, context, theme.fg("accent", `/${oneLine(args.pattern)}/`));
      text += theme.fg("toolOutput", ` in ${shortenPath(args.path || ".")}`);
      if (args.exclude) text += theme.fg("toolOutput", ` exclude ${truncate(oneLine(args.exclude), 40)}`);
      if (args.limit !== undefined) text += theme.fg("toolOutput", ` limit ${args.limit}`);
      return text;
    }),
    ["match", "matches"],
  );

  overridePackageTool(
    pi,
    fffTools.get("fffind"),
    call("fffind", (args, theme, context) => {
      let text = withTitle("fffind", theme, context, theme.fg("accent", oneLine(args.pattern)));
      text += theme.fg("toolOutput", ` in ${shortenPath(args.path || ".")}`);
      if (args.exclude) text += theme.fg("toolOutput", ` exclude ${truncate(oneLine(args.exclude), 40)}`);
      if (args.limit !== undefined) text += theme.fg("toolOutput", ` limit ${args.limit}`);
      return text;
    }),
    ["file", "files"],
  );

}

function overrideBuiltIn<K extends keyof ReturnType<typeof createBuiltInTools>>(
  pi: ExtensionAPI,
  name: K,
  renderCall: RenderCall,
  renderResult: any = result(),
) {
  pi.registerTool({
    ...getBuiltInTools(process.cwd())[name],
    renderShell: "self",
    async execute(toolCallId: string, params: any, signal: AbortSignal | undefined, onUpdate: any, ctx: any) {
      return (getBuiltInTools(ctx.cwd)[name] as any).execute(toolCallId, params, signal, onUpdate);
    },
    renderCall,
    renderResult,
  } as any);
}

function registerBuiltInTools(pi: ExtensionAPI) {
  overrideBuiltIn(
    pi,
    "read",
    call("read", (args, theme, context) => {
      let text = withTitle("read", theme, context, theme.fg("accent", shortenPath(args.path || "...")));
      if (args.offset !== undefined || args.limit !== undefined) {
        const start = args.offset ?? 1;
        const end = args.limit !== undefined ? start + args.limit - 1 : undefined;
        text += theme.fg("warning", `:${start}${end ? `-${end}` : ""}`);
      }
      return text;
    }),
  );

  const renderBash = call("bash", (args, theme, context) => {
    let text = withTitle("$", theme, context, theme.fg("accent", args.command || "..."));
    if (args.timeout) text += theme.fg("dim", ` (timeout ${args.timeout}s)`);
    return text;
  });
  overrideBuiltIn(pi, "bash", renderBash);

  overrideBuiltIn(pi, "write", call("write", (args, theme, context) => {
    let text = withTitle("write", theme, context, theme.fg("accent", shortenPath(args.path || "...")));
    if (args.content) text += theme.fg("dim", ` (${args.content.split("\n").length} lines)`);
    return text;
  }));

  overrideBuiltIn(
    pi,
    "edit",
    call("edit", (args, theme, context) => withTitle("edit", theme, context, theme.fg("accent", shortenPath(args.path || "...")))),
    (toolResult: TextResult & { details?: { diff?: unknown } }, _view: any, theme: Theme, context: ToolRenderContext) => renderEditResult(toolResult, theme, context),
  );

  overrideBuiltIn(pi, "find", call("find", (args, theme, context) => {
    let text = withTitle("find", theme, context, theme.fg("accent", args.pattern || "..."));
    text += theme.fg("toolOutput", ` in ${shortenPath(args.path || ".")}`);
    if (args.limit !== undefined) text += theme.fg("toolOutput", ` limit ${args.limit}`);
    return text;
  }), result(["file", "files"]));

  overrideBuiltIn(pi, "grep", call("grep", (args, theme, context) => {
    let text = withTitle("grep", theme, context, theme.fg("accent", `/${args.pattern || "..."}/`));
    text += theme.fg("toolOutput", ` in ${shortenPath(args.path || ".")}`);
    if (args.glob) text += theme.fg("toolOutput", ` (${args.glob})`);
    if (args.ignoreCase) text += theme.fg("toolOutput", " -i");
    if (args.literal) text += theme.fg("toolOutput", " literal");
    if (args.limit !== undefined) text += theme.fg("toolOutput", ` limit ${args.limit}`);
    return text;
  }), result(["match", "matches"]));

  overrideBuiltIn(pi, "ls", call("ls", (args, theme, context) => {
    let text = withTitle("ls", theme, context, theme.fg("accent", shortenPath(args.path || ".")));
    if (args.limit !== undefined) text += theme.fg("toolOutput", ` limit ${args.limit}`);
    return text;
  }), result(["entry", "entries"]));
}

export default function minimalMode(pi: ExtensionAPI) {
  registerPackageTools(pi);
  registerBuiltInTools(pi);
}
