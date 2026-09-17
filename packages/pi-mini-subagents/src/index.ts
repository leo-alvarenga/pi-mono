import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import {
  capitalize,
  createSubagentRuntime,
  formatTokens,
  type SubagentRecord,
} from "@leo-alvarenga/pi-ext-core";

import {
  MAX_CONCURRENCY,
  MAX_PANEL_ROWS,
  MAX_PARALLEL_TASKS,
  MAX_STORED_OUTPUT,
  NEEDS_INPUT_MARKER,
  NEEDS_INPUT_SUFFIX,
  PANEL_TOGGLE_CHORD,
  PER_TASK_OUTPUT_CAP,
  READ_ONLY_TOOLS,
  REPORT_ENTRY,
  STATE_ENTRY,
  STATUS_STYLES,
  WIDGET_KEY,
  WRITE_TOOLS,
} from "./constants";

function getStyledSubagent(r: SubagentRecord, th: Theme): string {
  const task = r.task.replace(/\s*[\r\n]+\s*/g, " ");
  const style = STATUS_STYLES[r.status] ?? STATUS_STYLES.completed;
  let line = `${th.fg(style.fg, style.icon)} ${th.fg("accent", `#${r.id}`)} ${th.fg(style.fg, task)}`;
  if (r.status === "completed" && r.tokens) {
    line += th.fg("dim", ` · ${formatTokens(r.tokens)}`);
  }
  if (r.status === "failed") line += th.fg("dim", " · failed");
  if (r.status === "needs_input") line += th.fg("dim", " · needs input");
  if (r.allowWrite) line += th.fg("warning", " ✎");
  return line;
}

export default function (pi: ExtensionAPI): void {
  // Child subagent processes inherit PI_SUBAGENT=1; they must not be able to
  // spawn sub-subagents, so the tool/widget/command never register there.
  if (process.env.PI_SUBAGENT) return;

  createSubagentRuntime(pi, {
    toolName: "mini_subagent",
    toolLabel: "Mini Subagent",
    spawnFlagEnv: "PI_SUBAGENT",
    toolDescription:
      "Delegate a task to a transient headless subagent (a separate pi process) and get its findings back. " +
      "Modes: single (task) or parallel (tasks array, max 8). Subagents are read-only by default; set allowWrite to let one edit files. " +
      "If a subagent reports it needs input (NEEDS_INPUT), answer the questions and call again with `answers`.",
    promptSnippet:
      "Delegate a task to a transient read-only subagent (single or parallel)",
    promptGuidelines: [
      "Subagents are read-only unless you set allowWrite: true.",
      "If a result asks for input, answer the questions (ask the user if needed) and re-call with `answers` — do not guess.",
    ],
    promptInstructions: {
      always: "You are a transient subagent. Complete the task, then stop",
      readOnly:
        "You may only READ and EXPLORE. Do not modify files or run mutating commands.",
      writeAllowed:
        "You may edit files ONLY if strictly necessary, preferring hash-anchored operations (replace/insert) over rewriting.",
    },
    needsInput: {
      marker: NEEDS_INPUT_MARKER,
      suffix: NEEDS_INPUT_SUFFIX,
    },
    allowlists: {
      readOnly: READ_ONLY_TOOLS,
      writeable: WRITE_TOOLS,
    },

    limits: {
      maxPanelRows: MAX_PANEL_ROWS,
      maxConcurrency: MAX_CONCURRENCY,
      maxStoredOutput: MAX_STORED_OUTPUT,
      maxParallelTasks: MAX_PARALLEL_TASKS,
      perTaskOutputCap: PER_TASK_OUTPUT_CAP,
    },

    state: { entryType: STATE_ENTRY },
    report: { entryType: REPORT_ENTRY },

    panel: {
      widgetKey: WIDGET_KEY,
      toggleChord: PANEL_TOGGLE_CHORD,
      title: "Subagents",
      emptyText: "No subagents yet. Ask the agent to delegate a task!",
    },

    rowLine: (r, theme) => getStyledSubagent(r, theme),
    reportSections: (s) => {
      const byStatus = s.records.reduce<Record<string, SubagentRecord[]>>(
        (acc, curr) => {
          const label = capitalize(curr.status.toLowerCase()).replaceAll(
            "_",
            " ",
          );

          if (!acc[label]?.length) acc[label] = [];

          acc[label].push(curr);

          return acc;
        },
        {},
      );

      return Object.entries(byStatus).map(([label, records]) => ({
        label,
        records,
      }));
    },
  });
}
