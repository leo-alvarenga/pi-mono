import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TokenUsage } from "@leo-alvarenga/pi-ext-core";

/** Token usage plus the context-window figures the panel renders. */
export type ContextUsage = TokenUsage & {
  tokens: number;
  window: number;
  percent: number;
};

type EntryUsage = {
  usage?: TokenUsage;
};

function getUsageFromEntries(ctx: ExtensionContext): TokenUsage {
  let input = 0,
    output = 0;

  for (const entry of ctx.sessionManager.getEntries()) {
    const usage =
      entry.type === "compaction" || entry.type === "branch_summary"
        ? (entry as EntryUsage).usage
        : (entry as { message?: EntryUsage }).message?.usage;

    if (!usage) continue;

    input += usage.input ?? 0;
    output += usage.output ?? 0;
  }

  return { input, output };
}

export function getUsage(ctx?: ExtensionContext): ContextUsage | null {
  if (!ctx) return null;

  const usage = ctx.getContextUsage();
  if (!usage) return null;

  return {
    ...getUsageFromEntries(ctx),
    tokens: usage?.tokens ?? 0,
    percent: usage?.percent ?? 0,
    window: usage?.contextWindow ?? 0,
  };
}
