/**
 * Segment registry. To add a new component:
 *   1. create `extensions/components/<name>.ts` exporting a `SegmentDef`
 *   2. import it here and append to `segments`
 * The frame calls `segmentsFor(slot, ...)` and handles all width/joining.
 */
import { modelSegment } from "./model";
import { reasoningSegment } from "./reasoning";
import { spinnerSegment } from "./spinner";
import { tokenCountSegment } from "./token-count";
import { cwdSegment } from "./cwd";
import { agentModeSegment } from "./agent-mode";
import type { FrameData, SegmentContext, SegmentDef, Slot } from "./types";

export const segments: SegmentDef[] = [
  modelSegment,
  reasoningSegment,
  spinnerSegment,
  tokenCountSegment,
  agentModeSegment,
  cwdSegment,
];

/** Render all segments for a slot, joined with " · ". A `replaces` segment
 *  (e.g. the spinner during an active phase) takes the whole slot. */
export function segmentsFor(
  slot: Slot,
  d: FrameData,
  ctx: SegmentContext,
): string {
  const defs = segments.filter(
    (s) => s.slot === slot && (!s.enabled || s.enabled(d, ctx.cfg)),
  );

  const replacer = defs.find((s) => s.replaces?.(d, ctx.cfg));
  const active = replacer ? [replacer] : defs;

  return active
    .map((s) => s.render(d, ctx))
    .filter((t) => t !== "")
    .join(ctx.border("·"));
}
