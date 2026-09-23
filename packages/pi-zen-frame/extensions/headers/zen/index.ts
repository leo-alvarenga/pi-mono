import type { TUI } from "@earendil-works/pi-tui";
import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";

import { GREETINGS, LOGO_COLOR, LOGO_LINES } from "../../config/constants";
import type { Settings } from "../../config/types";
import type { HeaderEnv } from "../types";
import { center, wrapLines } from "../../utils";
import { QUOTES } from "./quotes";

const TOP_PAD = 2;

const GREETING = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]!;
const QUOTE = QUOTES[Math.floor(Math.random() * QUOTES.length)]!;

export function createZenHeader(
  _tui: TUI,
  theme: Theme,
  _pi: ExtensionAPI,
  settings: Settings,
  _getEnv: (pi: ExtensionAPI) => HeaderEnv,
) {
  if (!settings.header?.enable) {
    return { render: (): string[] => [], invalidate() {} };
  }

  return {
    invalidate() {},

    render(width: number): string[] {
      const lines: string[] = [];

      for (let i = 0; i < TOP_PAD; i++) lines.push("");

      for (const line of LOGO_LINES) {
        lines.push(center(theme.fg(LOGO_COLOR, line), width));
      }

      lines.push("");
      lines.push(center(theme.bold(GREETING), width));
      lines.push("");

      const quoteText = `"${QUOTE.text}"  — ${QUOTE.author}`;
      for (const l of wrapLines([quoteText], Math.min(width - 4, 80))) {
        lines.push(center(theme.italic(theme.fg("muted", l)), width));
      }

      lines.push("");
      return lines;
    },
  };
}
