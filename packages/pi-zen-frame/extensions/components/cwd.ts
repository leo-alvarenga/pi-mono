import type { SegmentDef } from "./types";
import { getShortCwd } from "../utils";

/** Bottom-right: working directory + git branch (with dirty count). */
export const cwdSegment: SegmentDef = {
  id: "cwd",
  slot: "bottomRight",
  enabled: (_d, cfg) => cfg.showCwd !== false,
  render: (d, { theme, icons, segColor }) => {
    const folder = getShortCwd(d.cwd);

    let text = theme.fg(
      segColor("cwd", "muted"),
      `${icons.folder} ${folder}`,
    );

    if (d.gitBranch) {
      let git = ` ${icons.gitBranch} ${d.gitBranch}`;
      text += theme.fg(segColor("cwd", d.accentColor), git);

      if (d.gitDirty > 0) {
        text += theme.fg(
          segColor("cwd", "error"),
          ` ${icons.gitDirty} ${d.gitDirty}`,
        );
      }
    }

    return ` ${text} `;
  },
};
