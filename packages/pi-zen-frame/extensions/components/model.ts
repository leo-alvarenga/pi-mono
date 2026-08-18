import type { SegmentDef } from "./types";

/** Box bottom (left): the active model name. */
export const modelSegment: SegmentDef = {
  id: "model",
  slot: "topLeft",
  enabled: (_d, cfg) => cfg.showModel !== false,
  render: (d, { theme }) => {
    if (!d.modelName) return "";

    return ` ${theme.fg("text", d.modelName)} ${theme.fg("muted", `(${d.modelProvider})`)} `;
  },
};
