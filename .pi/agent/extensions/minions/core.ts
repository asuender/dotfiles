import * as fs from "node:fs";
import type { Message, Usage } from "@earendil-works/pi-ai";
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  type ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

export const DEFAULT_CONFIG = {
  model: "openrouter/deepseek/deepseek-v4-flash-0731",
  thinking: "low",
  tools: ["read", "grep", "find", "ls", "bash", "edit", "write"],
} as const;

export type MinionConfig = {
  model: string;
  thinking: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  tools: string[];
};

export type MinionProgress = {
  messages: Message[];
  finalOutput: string;
  usage: Usage;
  durationMs: number;
};

const THINKING_LEVELS = new Set<MinionConfig["thinking"]>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

const EMPTY_USAGE: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

export const MINION_SYSTEM_PROMPT = [
  "You are Minion, a focused execution subagent for the current repository.",
  "Complete only the task delegated to you using the available tools.",
  "Inspect the codebase before making assumptions, make targeted changes when requested, and verify your work when feasible.",
  "Follow all repository instruction files and conventions loaded by Pi.",
  "If the task is ambiguous or blocked, stop and report the blocker instead of guessing.",
  "Do not delegate to subagents or invoke minions.",
  "Keep the final response concise: summarize the result, list important files changed or findings, and note verification gaps.",
].join("\n");

export function parseConfig(raw: unknown): MinionConfig {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Minions config must be a JSON object");
  }

  const value = raw as Record<string, unknown>;
  const model = value.model ?? DEFAULT_CONFIG.model;
  const thinking = value.thinking ?? DEFAULT_CONFIG.thinking;
  const tools = value.tools ?? DEFAULT_CONFIG.tools;

  if (typeof model !== "string" || !model.includes("/")) {
    throw new Error('Minions config "model" must use provider/model format');
  }
  if (typeof thinking !== "string" || !THINKING_LEVELS.has(thinking as MinionConfig["thinking"])) {
    throw new Error(`Invalid minion thinking level: ${String(thinking)}`);
  }
  if (!Array.isArray(tools) || tools.length === 0 || tools.some((tool) => typeof tool !== "string" || !tool.trim())) {
    throw new Error('Minions config "tools" must be a non-empty string array');
  }

  return { model, thinking: thinking as MinionConfig["thinking"], tools: [...tools] as string[] };
}

export function loadConfig(configPath: string): MinionConfig {
  if (!fs.existsSync(configPath)) return parseConfig({});
  try {
    return parseConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in ${configPath}: ${error.message}`);
    throw error;
  }
}

export function getFinalOutput(messages: Message[]): string {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const text = message.content.find((part) => part.type === "text");
    if (text?.type === "text") return text.text;
  }
  return "";
}

function addUsage(total: Usage, usage: Usage): void {
  total.input += usage.input ?? 0;
  total.output += usage.output ?? 0;
  total.cacheRead += usage.cacheRead ?? 0;
  total.cacheWrite += usage.cacheWrite ?? 0;
  total.totalTokens += usage.totalTokens ?? 0;
  total.cost.input += usage.cost?.input ?? 0;
  total.cost.output += usage.cost?.output ?? 0;
  total.cost.cacheRead += usage.cost?.cacheRead ?? 0;
  total.cost.cacheWrite += usage.cost?.cacheWrite ?? 0;
  total.cost.total += usage.cost?.total ?? 0;
}

export async function runMinion(options: {
  task: string;
  cwd: string;
  config: MinionConfig;
  modelRuntime: ModelRuntime;
  signal?: AbortSignal;
  onProgress?: (progress: MinionProgress) => void;
}): Promise<MinionProgress> {
  const [provider, ...modelParts] = options.config.model.split("/");
  const model = options.modelRuntime.getModel(provider, modelParts.join("/"));
  if (!model) throw new Error(`Minion model is unavailable: ${options.config.model}`);

  const loader = new DefaultResourceLoader({
    cwd: options.cwd,
    agentDir: getAgentDir(),
    noExtensions: true,
    appendSystemPrompt: [MINION_SYSTEM_PROMPT],
  });
  await loader.reload();

  const { session } = await createAgentSession({
    cwd: options.cwd,
    agentDir: getAgentDir(),
    modelRuntime: options.modelRuntime,
    model,
    thinkingLevel: options.config.thinking,
    tools: options.config.tools,
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(options.cwd),
  });

  const startedAt = Date.now();
  const messages: Message[] = [];
  const usage: Usage = structuredClone(EMPTY_USAGE);
  let stopReason: string | undefined;
  let errorMessage: string | undefined;
  const emit = () =>
    options.onProgress?.({
      messages: [...messages],
      finalOutput: getFinalOutput(messages),
      usage,
      durationMs: Date.now() - startedAt,
    });

  const unsubscribe = session.subscribe((event) => {
    if (event.type !== "message_end") return;
    const message = event.message as Message;
    messages.push(message);
    if (message.role === "assistant") {
      if (message.usage) addUsage(usage, message.usage);
      stopReason = message.stopReason;
      errorMessage = message.errorMessage;
    }
    emit();
  });

  const abort = () => void session.abort();
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });

  try {
    options.signal?.throwIfAborted();
    await session.prompt(`Task: ${options.task}`);

    if (stopReason === "error") {
      throw new Error(errorMessage || "Minion failed");
    }
    if (stopReason === "aborted") {
      throw new Error(errorMessage || "Minion stopped: aborted");
    }
    const finalOutput = getFinalOutput(messages);
    if (!finalOutput) throw new Error("Minion produced no final output");
    return { messages, finalOutput, usage, durationMs: Date.now() - startedAt };
  } finally {
    options.signal?.removeEventListener("abort", abort);
    unsubscribe();
    session.dispose();
  }
}
