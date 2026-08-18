/**
 * Row layout for the borderless band editor.
 *
 * composeBand assembles the bg-filled band: padding rows, content (prefix on
 * the first row), autocomplete, one blank row, then the box-bottom segments.
 * Every output row is exactly `width` columns. fitFrameRow/fitInfoRow lay out
 * the header and status rows.
 */
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const SGR_RE = /\x1b\[[0-9;]*m/g;
const CURSOR_MARKER_RE = /\x1b_pi:c\x07/g;

function plain(row: string): string {
  return row.replace(SGR_RE, "").replace(CURSOR_MARKER_RE, "");
}

/** A border row is all `─`, or a `─── ↑/↓ N more ───` scroll indicator. */
export function isBorderRow(row: string): boolean {
  const t = plain(row).trim();

  if (t === "") return true;
  if (/^─+$/.test(t)) return true;

  return /^─── [↑↓] \d+ more ─*$/.test(t);
}

export interface BandOptions {
  padX: number;
  width: number;
  prefix: string;
  marginX: number;
  boxBottom: string;
  paddingTop: number;
  paddingBottom: number;
  paint: (row: string) => string;
}

/** Borderless bg band: padding, content (prefix on first row), autocomplete,
 *  blank row, box-bottom segments. Every row is exactly `width` columns. */
export function composeBand(
  content: string[],
  autocomplete: string[],
  opts: BandOptions,
): string[] {
  const {
    padX,
    paint,
    width,
    prefix,
    marginX,
    boxBottom,
    paddingTop,
    paddingBottom,
  } = opts;

  const lead = Math.max(0, padX - visibleWidth(prefix));

  const inset = (row: string) =>
    paint(prefix + " ".repeat(lead) + row + " ".repeat(padX));

  const fill = () => inset(paint(" ".repeat(Math.max(0, width - 2 * padX))));

  const rows: string[] = [];
  for (let i = 0; i < paddingTop; i++) rows.push(fill());

  content.forEach((row) => {
    rows.push(inset(row));
  });

  autocomplete.forEach((row) => rows.push(inset(row)));

  rows.push(fill());
  rows.push(inset(boxBottom));

  for (let i = 0; i < paddingBottom; i++) rows.push(fill());
  return rows;
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
