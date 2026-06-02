import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROMPT =
  "Caveman full: terse, no filler/hedge/articles where safe. Preserve tech detail. Code/errors/API exact. Normal clarity for security/destructive/ambiguity.";

export default function autoCaveman(pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => ({
    systemPrompt: `${event.systemPrompt}\n\n${PROMPT}`,
  }));
}
