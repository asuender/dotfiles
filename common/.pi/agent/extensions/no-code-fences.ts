import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Markdown } from "@earendil-works/pi-tui";

export default function (_pi: ExtensionAPI) {
  const proto = Markdown.prototype as unknown as {
    renderToken?: (
      token: unknown,
      width: number,
      nextTokenType?: string,
      styleContext?: unknown,
    ) => string[];
    __piNoCodeFencesPatched?: boolean;
  };

  if (proto.__piNoCodeFencesPatched || !proto.renderToken) {
    return;
  }

  const original = proto.renderToken;

  proto.renderToken = function (
    this: {
      theme: {
        codeBlockIndent?: string;
        codeBlock: (text: string) => string;
        highlightCode?: (code: string, lang?: string) => string[];
      };
    },
    token: unknown,
    width: number,
    nextTokenType?: string,
    styleContext?: unknown,
  ): string[] {
    if (!token || typeof token !== "object" || (token as { type?: string }).type !== "code") {
      return original.call(this, token, width, nextTokenType, styleContext);
    }

    const codeToken = token as { text?: string; lang?: string };
    const code = codeToken.text ?? "";
    const indent = "";
    const lines: string[] = [];

    if (this.theme.highlightCode) {
      for (const line of this.theme.highlightCode(code, codeToken.lang)) {
        lines.push(`${indent}${line}`);
      }
    } else {
      for (const line of code.split("\n")) {
        lines.push(`${indent}${this.theme.codeBlock(line)}`);
      }
    }

    if (nextTokenType && nextTokenType !== "space") {
      lines.push("");
    }

    return lines;
  };

  proto.__piNoCodeFencesPatched = true;
}
