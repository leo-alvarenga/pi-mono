import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

import { REPORT_ENTRY } from "./constants";
import type { SubagentStore } from "./state";
import type { SubagentRecord } from "./types";
import { getStyledSubagent } from "./utils";

function renderReport(records: SubagentRecord[], theme: Theme): string {
  if (records.length === 0) return `  ${theme.fg("dim", "No subagents.")}`;

  const lines: string[] = [];
  const section = (label: string, items: SubagentRecord[]): void => {
    if (items.length === 0) return;

    lines.push(`  ${theme.fg("muted", `${label} (${items.length})`)}`);

    for (const r of items) {
      lines.push(getStyledSubagent(r, theme));
    }

    lines.push("");
  };

  section(
    "Running",
    records.filter((r) => r.status === "running"),
  );

  section(
    "Needs input",
    records.filter((r) => r.status === "needs_input"),
  );

  section(
    "Completed",
    records.filter((r) => r.status === "completed"),
  );

  section(
    "Failed",
    records.filter((r) => r.status === "failed"),
  );

  return lines.join("\n");
}

export function registerSubagentsCommand(
  pi: ExtensionAPI,
  store: SubagentStore,
): void {
  pi.registerCommand("subagents", {
    description: "Show all subagents grouped by status",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/subagents requires interactive mode", "error");
        return;
      }

      pi.appendEntry(REPORT_ENTRY, {
        records: [...store.getState(ctx).records],
      });
    },
  });

  pi.registerEntryRenderer<{ records: SubagentRecord[] }>(
    REPORT_ENTRY,
    (entry, _options, theme) =>
      new Text(renderReport(entry.data?.records ?? [], theme), 0, 0),
  );
}
