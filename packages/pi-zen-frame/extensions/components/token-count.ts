import type { ThemeColor } from "@earendil-works/pi-coding-agent";

import type { SegmentDef } from "./types";

function trimFixed1(n: number): string {
  const t = n.toFixed(1);
  return t.endsWith(".0") ? t.slice(0, -2) : t;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${trimFixed1(n / 1_000_000)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;

  return `${n}`;
}

function formatWindow(n: number): string {
  if (n >= 1_000_000) return `${trimFixed1(n / 1_000_000)}M`;
  return `${(n / 1_000).toFixed(0)}k`;
}

/** Box bottom (right): context window usage (percent + used/window tokens). */
export const tokenCountSegment: SegmentDef = {
  id: "token-count",
  slot: "bottomRight",
  enabled: (_d, cfg) => cfg.showContext !== false,
  render: (d, { theme, icons }) => {
    const c = d.context;
    if (!c) return "";

    const pct = c.percent === null ? "?" : `${Math.round(c.percent)}%`;
    let color: ThemeColor = "muted";

    if (c.percent !== null) {
      if (c.percent >= 80) {
        color = "error";
      } else if (c.percent >= 50) {
        color = "warning";
      } else {
        color = "success";
      }
    }

    const color2 = d.zenMode ? "muted" : color;
    const used = c.tokens === null ? "?" : formatTokens(c.tokens);

    return (
      theme.fg(color2, ` ${icons.context} ctx ${pct} `) +
      theme.fg("dim", "·") +
      theme.fg(color2, ` ${used}/${formatWindow(c.window)} `)
    );
  },
};
