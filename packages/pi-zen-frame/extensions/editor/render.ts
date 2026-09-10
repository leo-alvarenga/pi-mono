import { DEFAULT_ICONS } from "../config/constants";
import { composeBand, fitInfoRow, isBorderRow } from "../components/frame";
import { segmentsFor } from "../components/registry";
import type {
  ExternalData,
  FrameData,
  SegmentContext,
} from "../components/types";
import type { EditorFrameRenderOptions } from "../renderers/types";

export function renderEditorFrame(
  getInnerLines: (innerWidth: number) => string[],
  opts: EditorFrameRenderOptions,
  ext: ExternalData,
  d: FrameData,
  prefix: string,
  width: number,
): string[] {
  const frame = opts.frame;

  const padX = Math.min(2, Math.max(0, Math.floor(width / 2)));
  const marginX = Math.min(1, Math.max(0, Math.floor(width / 2)));

  const contentWidth = width - marginX * 2;
  const innerWidth = width - padX * 2 - marginX * 2;

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

  const bgSgr = ext.theme!.getBgAnsi("customMessageBg");
  const paint = (row: string) =>
    bgSgr + row.split("\x1b[0m").join(`\x1b[0m${bgSgr}`) + "\x1b[0m";

  const ctx: SegmentContext = {
    cfg: frame,
    theme: ext.theme!,
    icons: DEFAULT_ICONS,
  };

  const box = composeBand(content, autocomplete, {
    padX,
    paint,
    prefix,
    marginX: 1,
    paddingTop: 1,
    paddingBottom: 1,
    width: contentWidth,
    boxBottom: fitInfoRow(
      segmentsFor("topLeft", d, ctx),
      segmentsFor("topRight", d, ctx),
      innerWidth,
    ),
  });

  const pseudoFooter = fitInfoRow(
    segmentsFor("bottomLeft", d, ctx),
    segmentsFor("bottomRight", d, ctx),
    contentWidth,
  );

  // Blank rows OUTSIDE the band, above/below it.
  const marginRow = " ".repeat(contentWidth);
  const marginTop: string[] = [];
  const marginBottom: string[] = [];

  return [...marginTop, ...box, marginRow, pseudoFooter, ...marginBottom].map(
    (row) => " ".repeat(marginX) + row + " ".repeat(marginX),
  );
}
