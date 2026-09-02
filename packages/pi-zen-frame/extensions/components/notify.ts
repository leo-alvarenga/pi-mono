import type { SegmentDef } from "./types";

/** Box bottom (left): pi-notify bell, right before the model segment.
 *  Accent when notifications are on, muted bell-off otherwise */
export const notifySegment: SegmentDef = {
  id: "notify",
  slot: "topLeft",
  render: (d, { icons, theme }) => {
    const color = d.notifyEnabled && !d.zenMode ? d.accentColor : "muted";

    return theme.fg(color, ` ${d.notifyEnabled ? icons.bell : icons.bellOff} `);
  },
};
