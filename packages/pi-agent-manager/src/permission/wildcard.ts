/**
 * Wildcard pattern matching — ported from OpenCode's
 * `packages/opencode/src/util/wildcard.ts`.
 *
 * `*` matches zero or more chars, `?` matches exactly one.
 * A trailing ` *` (space + star) is treated as optional so `"ls *"` matches
 * both `"ls"` and `"ls -la"`. Backslashes are normalised to `/`.
 */

export function wildcardMatch(str: string, pattern: string): boolean {
  if (str) str = str.replaceAll("\\", "/");
  if (pattern) pattern = pattern.replaceAll("\\", "/");

  let escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  if (escaped.endsWith(" .*")) {
    escaped = escaped.slice(0, -3) + "( .*)?";
  }

  const flags = process.platform === "win32" ? "si" : "s";
  return new RegExp("^" + escaped + "$", flags).test(str);
}
