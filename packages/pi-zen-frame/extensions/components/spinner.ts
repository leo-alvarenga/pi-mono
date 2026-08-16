import type { SegmentDef } from "./types";

/** Status animation. When a phase is active it REPLACES the top-left slot
 *  (model + reasoning) until the phase ends. */
export const spinnerSegment: SegmentDef = {
  id: "spinner",
  slot: "topLeft",
  enabled: (d, cfg) =>
    cfg.showSpinner === true &&
    d.spinnerPhase !== null &&
    d.spinnerPhase !== "idle",
  render: (d, { theme }) => {
    let phase = d.spinnerPhase ?? "thinking";

    // No frame.colors key for the spinner; zen mutes it, else accent.
    const spinner = theme.fg(
      d.zenMode ? "muted" : d.accentColor,
      ` ${d.spinnerFrame} `,
    );
    if (phase === "idle") return spinner;

    return spinner + theme.fg("muted", `${phase} `);
  },
};
