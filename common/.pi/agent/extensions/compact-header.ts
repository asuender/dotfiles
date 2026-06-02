import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

function compactPath(path: string): string {
	const home = process.env.HOME;
	return home && path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

export default function compactHeader(pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setHeader((_tui, theme) => ({
			invalidate() {},
			render(width: number): string[] {
				const model = ctx.model?.name ?? ctx.model?.id ?? "no-model";
				const thinking = pi.getThinkingLevel();
				const brand = theme.fg("accent", theme.bold("pi"));
				const text = `${brand}${theme.fg("dim", ` v${VERSION} · ${model} ${thinking} · ${compactPath(ctx.cwd)}`)}`;
				return [truncateToWidth(text, width)];
			},
		}));
	});
}
