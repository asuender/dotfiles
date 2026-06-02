/**
 * Protected Paths Extension
 *
 * Blocks reads/writes/edits to protected paths.
 * Useful for preventing accidental modifications to sensitive files and leaking
 * secrets into model context or session logs.
 */

import fs from "node:fs";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const protectedPaths = [".env", ".git/"];
const pathBasedTools = new Set(["read", "write", "edit", "grep", "find", "ls"]);

interface IgnoreRule {
  raw: string;
  baseDir: string;
  regex: RegExp;
}

let cachedGitignorePath: string | undefined;
let cachedGitignoreMtimeMs = -1;
let cachedIgnoreRules: IgnoreRule[] = [];

export default function (pi: ExtensionAPI) {
  // pi.on("tool_call", async (event, ctx) => {
  //   const deniedResources = [...protectedPaths, ...getGitignoreRules().map((rule) => rule.raw)];
  //   const blockedPath = getBlockedPath(event.toolName, event.input, deniedResources);
  //   const blockedCommand = getBlockedCommand(event.toolName, event.input, deniedResources);
  //
  //   if (!blockedPath && !blockedCommand) {
  //     return undefined;
  //   }
  //
  //   const resource = blockedPath ?? blockedCommand;
  //   if (ctx.hasUI) {
  //     ctx.ui.notify(`Blocked access to protected resource: ${resource}`, "warning");
  //   }
  //   return { block: true, reason: `Resource "${resource}" is protected` };
  // });
}

function getBlockedPath(
  toolName: string,
  input: unknown,
  deniedResources: string[],
): string | undefined {
  if (!pathBasedTools.has(toolName) || !isRecord(input)) {
    return undefined;
  }

  const rawPath = typeof input.path === "string" ? input.path : ".";
  const normalizedPath = normalizePath(rawPath);
  const absolutePath = path.resolve(process.cwd(), rawPath);

  if (deniedResources.some((resource) => normalizedPath.includes(normalizePath(resource)))) {
    return rawPath;
  }

  if (cachedIgnoreRules.some((rule) => matchesIgnoreRule(rule, absolutePath))) {
    return rawPath;
  }

  return undefined;
}

function getBlockedCommand(
  toolName: string,
  input: unknown,
  deniedResources: string[],
): string | undefined {
  if (toolName !== "bash" || !isRecord(input) || typeof input.command !== "string") {
    return undefined;
  }

  const command = normalizePath(input.command);
  const matchedResource = deniedResources.find((resource) =>
    command.includes(normalizePath(resource)),
  );

  if (!matchedResource) {
    return undefined;
  }

  return matchedResource;
}

function getGitignoreRules(): IgnoreRule[] {
  const gitignorePath = findNearestGitignore(process.cwd());
  if (!gitignorePath) {
    cachedGitignorePath = undefined;
    cachedGitignoreMtimeMs = -1;
    cachedIgnoreRules = [];
    return cachedIgnoreRules;
  }

  const mtimeMs = fs.statSync(gitignorePath).mtimeMs;
  if (gitignorePath === cachedGitignorePath && mtimeMs === cachedGitignoreMtimeMs) {
    return cachedIgnoreRules;
  }

  cachedGitignorePath = gitignorePath;
  cachedGitignoreMtimeMs = mtimeMs;
  cachedIgnoreRules = parseGitignore(gitignorePath);
  return cachedIgnoreRules;
}

function findNearestGitignore(startDir: string): string | undefined {
  let dir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(dir, ".gitignore");
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    if (fs.existsSync(path.join(dir, ".git"))) {
      return undefined;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

function parseGitignore(gitignorePath: string): IgnoreRule[] {
  const baseDir = path.dirname(gitignorePath);

  return fs
    .readFileSync(gitignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"))
    .map((raw) => ({ raw, baseDir, regex: gitignorePatternToRegex(raw) }));
}

function matchesIgnoreRule(rule: IgnoreRule, absolutePath: string): boolean {
  const relativePath = normalizePath(path.relative(rule.baseDir, absolutePath));
  return rule.regex.test(relativePath);
}

function gitignorePatternToRegex(pattern: string): RegExp {
  let normalized = normalizePath(pattern);
  const directoryOnly = normalized.endsWith("/");
  const anchored = normalized.startsWith("/");

  normalized = normalized.replace(/^\/+/, "").replace(/\/+$/, "");

  const source = globToRegexSource(normalized);
  const prefix = anchored || normalized.includes("/") ? "^" : "(^|.*/)";
  const suffix = directoryOnly ? "(/.*)?$" : "($|/.*)";

  return new RegExp(`${prefix}${source}${suffix}`);
}

function globToRegexSource(glob: string): string {
  return glob
    .split("")
    .map((char) => {
      if (char === "*") return "[^/]*";
      if (char === "?") return "[^/]";
      return char.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
    })
    .join("");
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
