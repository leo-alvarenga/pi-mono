/** Domain: string manipulation. */

/** Uppercase the first character ("claude" → "Claude"). */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
