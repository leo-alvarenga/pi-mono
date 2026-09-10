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

    // No frame.colors key for the spinner; accent only.
    const spinner = theme.fg(
      d.accentColor,
      ` ${d.spinnerFrame} `,
    );
    if (phase === "idle") return spinner;

    return spinner + theme.fg("muted", `${phase} `);
  },
};
