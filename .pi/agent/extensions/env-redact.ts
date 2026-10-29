/**
 * Env Redact Extension
 *
 * Keeps secrets from .env files (.env, .env.local, prod.env, ...) out of the model context.
 * Template files (.env.example, .env.sample, .env.template, .env.dist) are left untouched.
 *
 * - read: values are replaced with `***`, keys and comments stay visible. Fails closed: lines
 *   that aren't blank, a comment or an uppercase KEY=value assignment are fully masked, so
 *   multi-line secrets stay hidden even when the read starts at an offset inside the value.
 * - grep: calls whose path or glob targets a .env file are blocked and pointed at read.
 *   Matches from .env files not covered by .gitignore are redacted in the output.
 * - bash: commands referencing a .env file are blocked and pointed at read.
 *
 * Redacted results get a note telling the model not to access the secrets in other ways.
 * Not covered: printenv, globs like `cat .e*`, scripts loading dotenv, transformed values.
 */

import { basename } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MASK = "***";
const NOTE =
  "[Note: actual secrets have been redacted. Do not attempt to read them in any other way. " +
  "Fully masked lines may be present to mask potential multi-line secrets]";

// Matches .env, .env.local, .env.production, prod.env, ...
const ENV_FILE = /^\.env(\..+)?$|\.env$/;

// KEY=value, optionally prefixed with `export`. Groups: prefix, value.
// Uppercase keys only: base64 lines of a multi-line secret (e.g. `MIIEvAB=`) would otherwise
// look like assignments when the read starts at an offset inside the value.
const ASSIGNMENT = /^(\s*(?:export\s+)?[A-Z_][A-Z0-9_]*\s*=\s*)(.*)$/;

// Truncation notices appended by pi's read tool, kept so the model can still page through.
const PI_NOTICE = /^\[(Showing lines |\d+ more lines in file|Line \d+ is )/;

function redactEnv(text: string): { text: string; count: number } {
  const out: string[] = [];
  let count = 0;
  // Quote char of a multi-line value we are currently inside, e.g. a PEM key.
  let openQuote: string | null = null;

  for (const line of text.split("\n")) {
    if (openQuote) {
      if (line.includes(openQuote)) {
        openQuote = null;
      }
      continue;
    }

    const match = line.match(ASSIGNMENT);
    if (!match) {
      // Fail closed: anything that isn't blank, a comment or a pi notice could be part of a
      // multi-line value whose opening line wasn't read (e.g. read with an offset).
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#") || PI_NOTICE.test(line)) {
        out.push(line);
      } else {
        out.push(MASK);
        count++;
      }
      continue;
    }

    if (match[2].trim() === "" || match[2].trimStart().startsWith("#")) {
      out.push(line);
      continue;
    }

    const value = match[2].trim();
    const quote = value[0] === '"' || value[0] === "'" || value[0] === "`" ? value[0] : null;
    if (quote && value.length > 1 && value.indexOf(quote, 1) === -1) {
      openQuote = quote;
    }

    out.push(quote ? `${match[1]}${quote}${MASK}${quote}` : `${match[1]}${MASK}`);
    count++;
  }

  return { text: out.join("\n"), count };
}

// Grep output lines: `path:N: text` for matches, `path-N- text` for context lines.
const GREP_LINE = /^(.*?)([:-])(\d+)\2 (.*)$/;

function redactGrep(text: string): { text: string; count: number } {
  let count = 0;
  const lines = text.split("\n").map((line) => {
    const match = line.match(GREP_LINE);
    if (!match || !isSecretEnvFile(match[1])) {
      return line;
    }
    const redacted = redactEnv(match[4]);
    count += redacted.count;
    return `${match[1]}${match[2]}${match[3]}${match[2]} ${redacted.text}`;
  });
  return { text: lines.join("\n"), count };
}

// Templates are meant to be shared and usually hold placeholders only.
const TEMPLATE_FILE = /^\.env\.(example|sample|template|dist)$/;

function isSecretEnvFile(path: string): boolean {
  const name = basename(path);
  return ENV_FILE.test(name) && !TEMPLATE_FILE.test(name);
}

// `.env` or `.env.<suffix>` as a standalone path segment. The lookbehind skips `process.env`
// and `import.meta.env`, the lookahead skips `.envrc`.
const BASH_ENV_REF = /(?<![\w$])\.env(?:\.[\w-]+)*(?![\w-])/g;

function bashTouchesEnv(command: string): boolean {
  return [...command.matchAll(BASH_ENV_REF)].some((m) => !TEMPLATE_FILE.test(m[0]));
}

const BLOCK_SUFFIX =
  "Use the read tool on the file instead, which returns it with secret values redacted. " +
  "Do not attempt to access this file in any other way.";

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    let reason: string | undefined;

    if (event.toolName === "grep") {
      const path = String(event.input.path ?? "");
      const glob = String(event.input.glob ?? "");
      if (isSecretEnvFile(path) || (/\.env/.test(glob) && !TEMPLATE_FILE.test(basename(glob)))) {
        reason = `Searching .env files with grep is blocked to protect secrets. ${BLOCK_SUFFIX}`;
      }
    } else if (event.toolName === "bash") {
      if (bashTouchesEnv(String(event.input.command ?? ""))) {
        reason =
          `Bash commands referencing .env files are blocked to protect secrets. ${BLOCK_SUFFIX} ` +
          "If you need to do something other than reading it, ask the user to do it.";
      }
    }

    if (!reason) {
      return undefined;
    }
    if (ctx.hasUI) {
      ctx.ui.notify(`Blocked ${event.toolName} call touching .env`, "warning");
    }
    return { block: true, reason };
  });

  pi.on("tool_result", async (event, ctx) => {
    if (event.isError) {
      return undefined;
    }

    let redact: ((text: string) => { text: string; count: number }) | undefined;
    if (event.toolName === "read" && isSecretEnvFile(String(event.input.path ?? ""))) {
      redact = redactEnv;
    } else if (event.toolName === "grep") {
      // Safety net for directory searches that hit a .env file not covered by .gitignore.
      redact = redactGrep;
    }
    if (!redact) {
      return undefined;
    }

    let total = 0;
    const content = event.content.map((part) => {
      if (part.type !== "text") {
        return part;
      }
      const { text, count } = redact(part.text);
      total += count;
      return { ...part, text };
    });

    if (total === 0) {
      return undefined;
    }

    if (ctx.hasUI) {
      ctx.ui.notify(`Redacted ${total} value(s) from ${event.toolName} output`, "info");
    }

    return { content: [...content, { type: "text", text: NOTE }] };
  });
}
