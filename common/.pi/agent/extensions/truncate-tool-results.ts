import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MAX_TOOL_TEXT_CHARS = 8_000;
const HEAD_CHARS = 5_500;
const TAIL_CHARS = 1_500;

function truncateText(text: string): string {
	if (text.length <= MAX_TOOL_TEXT_CHARS) return text;

	const omitted = text.length - HEAD_CHARS - TAIL_CHARS;
	return `${text.slice(0, HEAD_CHARS)}\n\n[... truncated ${omitted} chars from large tool output before sending to model ...]\n\n${text.slice(-TAIL_CHARS)}`;
}

export default function truncateLargeToolResults(pi: ExtensionAPI) {
	pi.on("context", async (event) => {
		let changed = false;

		const messages = event.messages.map((message) => {
			if (message.role !== "toolResult") return message;

			let messageChanged = false;
			const content = message.content.map((part) => {
				if (part.type !== "text" || typeof part.text !== "string") return part;
				const text = truncateText(part.text);
				if (text === part.text) return part;
				changed = true;
				messageChanged = true;
				return { ...part, text };
			});

			return messageChanged ? { ...message, content } : message;
		});

		return changed ? { messages } : undefined;
	});
}
