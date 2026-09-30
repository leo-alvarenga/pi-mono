import { Key } from "@earendil-works/pi-tui";

// Built from pi-tui's own table so we never maintain a hand-copied key list.
const BASE_KEYS = new Map<string, string>();

for (const value of Object.values(Key)) {
  if (typeof value === "string") BASE_KEYS.set(value.toLowerCase(), value);
}

for (const c of "abcdefghijklmnopqrstuvwxyz0123456789") BASE_KEYS.set(c, c);

const MODIFIERS = new Set(["ctrl", "shift", "alt", "super"]);
const MAX_PARTS = 5; // 4 modifiers + 1 key

/** Canonical key id, or null when the string is not a valid keybinding. */
export function normalizeKeyId(value: string): string | null {
  const parts = value.trim().split("+");

  if (parts.length === 0 || parts.length > MAX_PARTS) return null;

  const key = BASE_KEYS.get(parts.at(-1)!.toLowerCase());
  if (!key) return null;

  const modifiers: string[] = [];
  for (const raw of parts.slice(0, -1)) {
    const modifier = raw.trim().toLowerCase();
    if (!MODIFIERS.has(modifier) || modifiers.includes(modifier)) return null;

    modifiers.push(modifier);
  }

  return [...modifiers, key].join("+");
}

/** True when `value` names a valid key id. */
export function isValidKeyId(value: string): boolean {
  return normalizeKeyId(value) !== null;
}
