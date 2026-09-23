import { visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

export function wrapLines(
  lines: string[],
  maxLen: number,
  style?: (line: string) => string,
): string[] {
  const wrapped = lines.map((l) => wrapTextWithAnsi(l, maxLen)).flat();
  if (style) return wrapped.map((l) => (l.length ? style(l) : l));

  return wrapped;
}

/** Space-pad `text` so it sits horizontally centered within `inner` cols. */
export function center(text: string, inner: number): string {
  const w = visibleWidth(text);
  const left = Math.max(0, Math.floor((inner - w) / 2));
  const right = Math.max(0, inner - w - left);

  return " ".repeat(left) + text + " ".repeat(right);
}

/** Claude-style split row: │ logo (leftW) │ info (rightW) │ exactly `width` cols */
export function splitRow(
  leftW: number,
  rightW: number,
  left: string,
  right: string,
  border: (s: string) => string,
): string {
  const left2 = center(left, leftW);
  const right2 = "  " + right;
  const pad = " ".repeat(Math.max(0, rightW - visibleWidth(right2)));

  return border("│") + left2 + border("│") + right2 + pad + border("│");
}
