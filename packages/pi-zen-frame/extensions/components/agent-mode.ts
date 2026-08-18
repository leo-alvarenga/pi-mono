import { capitalize } from "../utils";

import type { SegmentDef } from "./types";

/** Pseudo-footer (left): the current Agent Mode from pi-agent-manager
 *  (when installed). Rendered as a pill using the agent's own color/icon. */
export const agentModeSegment: SegmentDef = {
  id: "agent-mode",
  slot: "topLeft",
  enabled: (_d, cfg) => cfg.showAgentMode !== false,

  render: (d, { theme }) => {
    const m = d.agentMode;
    if (!m) return "";

    // Agent's own color wins; accent fills in. Zen never mutes the agent.
    const color = m.color ?? d.accentColor;
    const label = ` ${capitalize(m.name)} `;

    try {
      return theme.fg(color, label);
    } catch {
      return theme.fg(d.accentColor, label);
    }
  },
};
