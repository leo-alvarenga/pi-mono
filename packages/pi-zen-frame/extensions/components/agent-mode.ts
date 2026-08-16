import { capitalize } from "../utils";
import type { SegmentDef } from "./types";

/** Top-right: the current Agent Mode from pi-agent-manager (when installed).
 *  Rendered as a pill using the agent's own color/icon. */
export const agentModeSegment: SegmentDef = {
  id: "agent-mode",
  slot: "bottomLeft",
  enabled: (_d, cfg) => cfg.showAgentMode !== false,

  render: (d, { theme, segColor }) => {
    const m = d.agentMode;
    if (!m) return "";

    // Agent's own color wins; frame.colors.agentMode fills in; zen never mutes.
    const color = m.color ?? segColor("agentMode", d.accentColor);
    const label = theme.bold(` ${m.icon ?? "◆"} ${capitalize(m.name)} `);

    try {
      return theme.fg(color, label);
    } catch {
      return theme.fg(d.accentColor, label);
    }
  },
};
