import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import type { ResolvedModel } from "./types";

/** `provider/id`: bare ids are ambiguous across providers and Pi rejects them */
export const modelRef = (m: { provider: string; id: string }) =>
  `${m.provider}/${m.id}`;

/** Inherit the orchestrator session's current model and thinking level */
export function defaultResolveModel(ctx: ExtensionContext): ResolvedModel {
  if (!ctx.model) return {};

  return { model: modelRef(ctx.model), thinking: ctx.thinkingLevel };
}

/** True when `ref` (`provider/id`) is a known model with configured auth */
export function isUsableModelRef(
  ctx: ExtensionContext,
  ref: string | undefined,
): boolean {
  if (!ref) return false;

  const slash = ref.indexOf("/");
  if (slash < 1) return false;

  const model = ctx.modelRegistry.find(
    ref.slice(0, slash),
    ref.slice(slash + 1),
  );

  return !!model && ctx.modelRegistry.hasConfiguredAuth(model);
}
