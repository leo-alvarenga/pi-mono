import type { SegmentDef } from "./types";

/** Box bottom (left): the active model name. */
export const modelSegment: SegmentDef = {
  id: "model",
  slot: "topLeft",
  enabled: (_d, cfg) => cfg.showModel !== false,
  render: (d, { icons, theme }) => {
    if (!d.modelName) return "";

    return ` ${theme.fg(d.accentColor, `${icons.model} ${d.modelName}`)} ${theme.fg("muted", `(${d.modelProvider})`)} `;
  },
};
