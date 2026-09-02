/** Domain: git interactions. */
import { execFileSync } from "node:child_process";

/** Snapshot of the repository state at read time. */
export interface GitInfo {
  branch: string | undefined;
  /** Number of lines in `git status --porcelain` (0 = clean). */
  dirty: number;
}

/** Best-effort git snapshot for a working directory. Falls back to
 *  `{ branch: undefined, dirty: 0 }` when git is unavailable or fails. */
export function readGit(cwd: string): GitInfo {
  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    }).trim();
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    });
    const dirty = status.split("\n").filter((l) => l.trim() !== "").length;
    return { branch: branch || undefined, dirty };
  } catch {
    return { branch: undefined, dirty: 0 };
  }
}
