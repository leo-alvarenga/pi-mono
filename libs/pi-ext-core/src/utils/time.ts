/**
 * Checks if a given duration has elapsed since a timestamp.
 * @param timestamp - Past timestamp
 * @param durationMs - Duration threshold in milliseconds
 * @returns True if elapsed time >= durationMs
 */
export function hasTimeElapsed(
  timestamp: number | string | Date,
  durationMs: number,
): boolean {
  const past = new Date(timestamp).getTime();
  const now = Date.now();

  return now - past >= durationMs;
}
