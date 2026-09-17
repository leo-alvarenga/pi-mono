/** Uppercase the first character */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Truncate a string to a char budget, appending an overrideable ellipsis marker */
export function truncateChars(
  text: string,
  max: number,
  ellipsisStr = "…",
): string {
  if (text.length <= max) return text;

  return `${text.slice(0, max)}${ellipsisStr}`;
}

/** Truncate to a UTF-8 byte budget; Useful for multi-byte single-char sequences */
export function truncateBytes(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;

  let out = text.slice(0, maxBytes);
  while (Buffer.byteLength(out, "utf8") > maxBytes) {
    out = out.slice(0, -1);
  }

  return `${out}\n\n[Output truncated: ${Buffer.byteLength(text, "utf8") - Buffer.byteLength(out, "utf8")} bytes omitted.]`;
}

/** Format a token count as a human-readable string */
export function formatTokens(n: number): string {
  if (n < 1000) return `${n} tokens`;
  if (n < 10000) return `${(n / 1000).toFixed(1)}k tokens`;

  return `${Math.round(n / 1000)}k tokens`;
}

/** Format a millisecond duration as a human-readable string */
export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return s < 1 ? "<1s" : `${s}s`;

  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;

  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
