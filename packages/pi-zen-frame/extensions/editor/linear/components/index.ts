import { agentModeSegment } from "../../../components/agent-mode";
import { cwdSegment } from "../../../components/cwd";
import { modelSegment } from "../../../components/model";
import { notifySegment } from "../../../components/notify";
import { reasoningSegment } from "../../../components/reasoning";
import { spinnerSegment } from "../../../components/spinner";
import { tokenCountSegment } from "../../../components/token-count";
import type {
  FrameData,
  SegmentContext,
  SegmentDef,
  Slot,
} from "../../../components/types";

// Re-wire global segments onto LinearEditor's slot layout:
//   topLeft / topRight  → above-band info row
//   bottomLeft          → below-band info row
const segments: SegmentDef[] = [
  { ...agentModeSegment, slot: "topLeft" },
  { ...notifySegment, slot: "topLeft" },
  { ...modelSegment, slot: "topLeft" },
  { ...reasoningSegment, slot: "topLeft" },
  { ...spinnerSegment, slot: "topLeft" },
  { ...tokenCountSegment, slot: "topRight" },
  { ...cwdSegment, slot: "bottomLeft" },
];

export function linearSegmentsFor(
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
    .join(ctx.theme.fg("dim", "·"));
}
