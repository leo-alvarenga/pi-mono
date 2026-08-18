import type { SegmentDef } from "./types";
import { getShortCwd } from "../utils";

/** Pseudo-footer (right): working directory + git branch (with dirty count). */
export const cwdSegment: SegmentDef = {
  id: "cwd",
  slot: "bottomLeft",
  enabled: (_d, cfg) => cfg.showCwd !== false,
  render: (d, { theme, icons }) => {
    const folder = getShortCwd(d.cwd);

    let text = theme.fg("muted", `${icons.folder} ${folder}`);

    if (d.gitBranch) {
      let git = ` ${icons.gitBranch} ${d.gitBranch}`;
      text += theme.fg(d.zenMode ? "muted" : d.accentColor, git);

      if (d.gitDirty > 0) {
        text += theme.fg(
          d.zenMode ? "muted" : "error",
          ` ${icons.gitDirty} ${d.gitDirty}`,
        );
      }
    }

    return ` ${text} `;
  },
};
