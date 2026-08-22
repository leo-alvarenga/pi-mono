import { ExtensionContext } from "@earendil-works/pi-coding-agent";

export type TokenUsage = TokenThroughput & {
  tokens: number;
  window: number;
  percent: number;
};

export type TokenThroughput = {
  input: number;
  output: number;
};

type EntryUsage = {
  usage?: TokenThroughput;
};

function getUsageFromEntries(ctx: ExtensionContext): TokenThroughput {
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

export function getUsage(ctx?: ExtensionContext): TokenUsage | null {
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
