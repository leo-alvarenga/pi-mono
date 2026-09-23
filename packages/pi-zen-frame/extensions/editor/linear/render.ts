import { DEFAULT_ICONS } from "../../config/constants";
import { fitInfoRow, isBorderRow } from "../../components/frame";
import type {
  ExternalData,
  FrameData,
  SegmentContext,
} from "../../components/types";
import type { EditorFrameRenderOptions } from "../../renderers/types";
import { linearSegmentsFor } from "./components";

const LINEAR_PREFIX = "❯";

export function renderLinearFrame(
  getInnerLines: (innerWidth: number) => string[],
  opts: EditorFrameRenderOptions,
  ext: ExternalData,
  d: FrameData,
  width: number,
): string[] {
  const marginX = Math.min(1, Math.max(0, Math.floor(width / 2)));
  const contentWidth = width - marginX * 2;

  const innerWidth = contentWidth - LINEAR_PREFIX.length;

  const inner = getInnerLines(innerWidth);

  let bottomIdx = inner.length - 1;
  for (let i = inner.length - 1; i >= 0; i--) {
    if (isBorderRow(inner[i]!)) {
      bottomIdx = i;
      break;
    }
  }

  const content = inner.slice(1, bottomIdx);
  const autocomplete = inner.slice(bottomIdx + 1);

  const ctx: SegmentContext = {
    cfg: opts.frame,
    theme: ext.theme!,
    icons: DEFAULT_ICONS,
  };

  const blankRow = " ".repeat(width);
  const regularPrefix = " ".repeat(marginX);
  const borderRow = ext.theme!.fg("dim", "─".repeat(width));
  const accentPrefix = ext.theme!.fg(opts.accentColor, LINEAR_PREFIX);

  const withMargin = (row: string) => regularPrefix + row + regularPrefix;

  const rows: string[] = [
    blankRow,

    withMargin(
      fitInfoRow(
        linearSegmentsFor("topLeft", d, ctx),
        linearSegmentsFor("topRight", d, ctx),
        contentWidth,
      ),
    ),

    borderRow,
  ];

  content.forEach((row, i) => {
    rows.push(withMargin((i === 0 ? accentPrefix : regularPrefix) + row));
  });

  autocomplete.forEach((row) => rows.push(withMargin(regularPrefix + row)));

  rows.push(
    borderRow,

    withMargin(
      fitInfoRow(
        linearSegmentsFor("bottomLeft", d, ctx),
        linearSegmentsFor("bottomRight", d, ctx),
        contentWidth,
      ),
    ),
  );

  return rows;
}
