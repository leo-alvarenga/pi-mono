/**
 * The box. Wraps the base editor's rows (rendered narrower) with rounded
 * corner glyphs, embeds the segment text into the top/bottom border, and
 * inserts the configurable blank padding lines inside the box.
 *
 * Row budget: content is rendered at `width - 2 - 2*paddingX`, wrapped with
 * `paddingX` spaces + a `│` on each side, so every output row is exactly
 * `width` columns — same contract as the default editor.
 */
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export interface FrameOptions {
  width: number;
  prefix?: string;
  paddingX: number;
  paddingTop: number;
  paddingBottom: number;
  border: (str: string) => string;
}

const SGR_RE = /\x1b\[[0-9;]*m/g;
const CURSOR_MARKER_RE = /\x1b_pi:c\x07/g;

function plain(row: string): string {
  return row.replace(SGR_RE, "").replace(CURSOR_MARKER_RE, "");
}

/** A border row is all `─`, or a `─── ↑/↓ N more ───` scroll indicator. */
function isBorderRow(row: string): boolean {
  const t = plain(row).trim();

  if (t === "") return true;
  if (/^─+$/.test(t)) return true;

  return /^─── [↑↓] \d+ more ─*$/.test(t);
}

/** Lay one border row: cap + leftText + ─fill + rightText + cap, always
 *  exactly `width` columns. Right text truncates first, then left text. */
export function fitFrameRow(
  leftCap: string,
  rightCap: string,
  leftText: string,
  rightText: string,
  width: number,
  border: (str: string) => string,
): string {
  const minGap = 3;
  const inner = Math.max(0, width - 2); // space between the two caps
  const rightText2 = truncateToWidth(
    rightText,
    Math.max(0, inner - minGap),
    "",
  );

  const leftBudget = Math.max(0, inner - minGap - visibleWidth(rightText2));
  const leftText2 = truncateToWidth(leftText, leftBudget, "");

  const fill = Math.max(
    0,
    inner - visibleWidth(leftText2) - visibleWidth(rightText2),
  );

  return (
    border(leftCap) +
    leftText2 +
    border("─".repeat(fill)) +
    rightText2 +
    border(rightCap)
  );
}

/** Lay one info row: leftText + spaces + rightText, exactly `width` cols.
 *  No border caps — plain text with gap fill. Right truncates first. */
export function fitInfoRow(
  leftText: string,
  rightText: string,
  width: number,
): string {
  const minGap = 3;
  const rightText2 = truncateToWidth(
    rightText,
    Math.max(0, width - minGap),
    "",
  );
  const leftBudget = Math.max(0, width - minGap - visibleWidth(rightText2));
  const leftText2 = truncateToWidth(leftText, leftBudget, "");
  const fill = Math.max(
    0,
    width - visibleWidth(leftText2) - visibleWidth(rightText2),
  );
  return leftText2 + " ".repeat(fill) + rightText2;
}

function wrapContent(row: string, paddingX: number): string {
  if (paddingX <= 0) return row;

  return " ".repeat(paddingX) + row + " ".repeat(paddingX);
}

export function renderFrame(inner: string[], opts: FrameOptions): string[] {
  const { border, width, paddingX, prefix } = opts;
  if (inner.length === 0) return inner;

  // The real bottom border is the last border-like row (autocomplete rows
  // are appended *after* it, so the last row is NOT necessarily the bottom).
  let bottomIdx = inner.length - 1;

  for (let i = inner.length - 1; i >= 0; i--) {
    if (isBorderRow(inner[i]!)) {
      bottomIdx = i;
      break;
    }
  }

  const result: string[] = [];
  const padRow = " ".repeat(Math.max(0, width));
  const fullBorder = border("─".repeat(width));

  result.push(fullBorder);

  for (let i = 0; i < opts.paddingTop; i++) result.push(padRow);

  for (let i = 1; i < bottomIdx; i++) {
    const decorator = i === 1 ? (prefix ?? "") : "";
    const content = decorator + inner[i]!;

    result.push(wrapContent(content, paddingX - visibleWidth(decorator)));
  }

  for (let i = 0; i < opts.paddingBottom; i++) result.push(padRow);

  result.push(fullBorder);

  for (let i = bottomIdx + 1; i < inner.length; i++) {
    result.push(wrapContent(inner[i]!, paddingX));
  }

  return result;
}
