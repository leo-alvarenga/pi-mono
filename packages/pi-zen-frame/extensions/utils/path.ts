/** Domain: path helpers. */
import { homedir } from "os";
import { basename } from "node:path";

/** Shorten an absolute path for display: `~`-ify the home dir, and collapse
 *  to the basename when the path is deeply nested. */
export function getShortCwd(cwd: string): string {
  const home = homedir();

  let path = cwd.replace(home, "~");
  const subpathCount = path.match(/\//gm)?.length ?? 0;

  if (subpathCount > 3) {
    path = basename(path);
  }

  return path;
}