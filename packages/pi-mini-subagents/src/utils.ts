import type { Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

import { MAX_PANEL_ROWS, PANEL_STATE_ICON, STATUS_STYLES } from "./constants";
import type { SubagentRecord } from "./types";

function formatTokens(n: number): string {
  if (n < 1000) return `${n} tokens`;
  if (n < 10000) return `${(n / 1000).toFixed(1)}k tokens`;

  return `${Math.round(n / 1000)}k tokens`;
}

export function getStyledSubagent(r: SubagentRecord, th: Theme): string {
  const style = STATUS_STYLES[r.status] ?? STATUS_STYLES.completed;
  let line = `${th.fg(style.fg, style.icon)} ${th.fg("accent", `#${r.id}`)} ${th.fg(style.fg, r.task)}`;

  if (r.status === "completed" && r.tokens) {
    line += th.fg("dim", ` · ${formatTokens(r.tokens)}`);
  }

  if (r.status === "failed") line += th.fg("dim", " · failed");
  if (r.status === "needs_input") line += th.fg("dim", " · needs input");
  if (r.allowWrite) line += th.fg("warning", " ✎");

  return line;
}

export function getStyledSubagentHeader(
  records: SubagentRecord[],
  th: Theme,
  isCollapsed?: boolean,
): string {
  const running = records.filter((r) => r.status === "running").length;

  const done = records.length - running;
  const collapseState = isCollapsed ? "collapsed" : "expanded";

  return th.fg(
    "accent",
    `${PANEL_STATE_ICON[collapseState]} ⏳ Subagents — ${running} running / ${done} done`,
  );
}

export function getStyledSubagentList(
  records: SubagentRecord[],
  th: Theme,
  width: number,
  isCollapsed?: boolean,
): string[] {
  const indent = (str: string, level = 1) => "  ".repeat(Math.abs(level)) + str;

  const lines: string[] = [
    truncateToWidth(
      indent(getStyledSubagentHeader(records, th, isCollapsed)),
      width,
    ),
  ];

  if (!isCollapsed) {
    lines.push("");

    if (records.length === 0) {
      lines.push(
        truncateToWidth(
          indent(
            th.fg("dim", "No subagents yet. Ask the agent to delegate a task!"),
            2,
          ),
          width,
        ),
      );
    } else {
      const running = records.filter((r) => r.status === "running");
      const finished = records.filter((r) => r.status !== "running");
      const visible = [...running, ...finished].slice(0, MAX_PANEL_ROWS);

      for (const r of visible) {
        lines.push(truncateToWidth(indent(getStyledSubagent(r, th), 2), width));
      }

      if (records.length > visible.length) {
        lines.push(
          truncateToWidth(
            indent(
              th.fg("dim", `… +${records.length - visible.length} more`),
              3,
            ),
            width,
          ),
        );
      }
    }
  }

  lines.push("");
  return lines;
}
