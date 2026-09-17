import { truncateChars } from "../utils/strings";

import type { SubagentRecord, SubagentStatus } from "./types";

export function classifyResult(opts: {
  exitCode: number;
  stopReason?: string;
  needsInput: boolean;
}): SubagentStatus {
  if (opts.needsInput) return "needs_input";

  if (
    opts.exitCode !== 0 ||
    opts.stopReason === "error" ||
    opts.stopReason === "aborted"
  ) {
    return "failed";
  }

  return "completed";
}

export function summarizeOutput(text: string, maxChars: number): string {
  return truncateChars(text, maxChars);
}

export function needsInputContent(r: SubagentRecord): string {
  const qs = (r.questions ?? []).map((q) => `- ${q}`).join("\n");

  return `The subagent needs input to complete this task.

Questions:
${qs || "- (unparsed)"}

Ask the user (or answer from context), then call mini_subagent again with the same \`task\` and your answers in \`answers\`.`;
}

export function singleContent(r: SubagentRecord): string {
  if (r.status === "needs_input") return needsInputContent(r);

  if (r.status === "failed") {
    return `Subagent failed: ${r.error ?? r.output ?? "(no output)"}`;
  }

  return r.output ?? "(no output)";
}
