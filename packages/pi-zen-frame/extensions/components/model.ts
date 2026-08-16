import type { SegmentDef } from "./types";

/** Top-left: the active model name. */
export const modelSegment: SegmentDef = {
  id: "model",
  slot: "topLeft",
  enabled: (_d, cfg) => cfg.showModel !== false,
  render: (d, { theme, icons, segColor }) => {
    if (!d.modelName) return "";

    return theme.fg(
      segColor("model", d.accentColor),
      ` ${icons.model} ${d.modelName} `,
    );
  },
};
