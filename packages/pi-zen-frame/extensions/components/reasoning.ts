import type { ThemeColor } from "@earendil-works/pi-coding-agent";

import type { SegmentDef } from "./types";
import { THINKING_TOKEN } from "../config/constants";

/** Box bottom (left): current thinking level, tinted with its own theme
 *  token — the same color pi applies to the border at that level. */
export const reasoningSegment: SegmentDef = {
  id: "reasoning",
  slot: "topLeft",
  enabled: (_d, cfg) => cfg.showThinking !== false,
  render: (d, { theme, icons }) => {
    if (!d.thinkingLevel) return "";

    const token = (THINKING_TOKEN[d.thinkingLevel] ??
      "thinkingText") as ThemeColor;

    return theme.fg(
      d.zenMode ? "muted" : token,
      ` ${icons.thinking} ${d.thinkingLevel} `,
    );
  },
};
