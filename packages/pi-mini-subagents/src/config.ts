import type { Theme } from "@earendil-works/pi-coding-agent";
import {
  capitalize,
  formatTokens,
  type SubagentRecord,
  type SubagentSpec,
} from "@leo-alvarenga/pi-ext-core";

import {
  MAX_CONCURRENCY,
  MAX_PANEL_ROWS,
  MAX_PARALLEL_TASKS,
  MAX_STORED_OUTPUT,
  MAX_WRITES_PER_SUBAGENT,
  NEEDS_INPUT_MARKER,
  NEEDS_INPUT_SUFFIX,
  PANEL_TOGGLE_CHORD,
  PER_TASK_OUTPUT_CAP,
  REPORT_ENTRY,
  STATE_ENTRY,
  STATUS_STYLES,
  WIDGET_KEY,
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

export const SUBAGENTS_SPEC: SubagentSpec = {
  tool: {
    name: "mini_subagents",
    label: "Mini Subagents",
    description:
      "Delegate a task to a transient headless subagent (a separate pi process) and get its findings back. " +
      "Modes: single (task) or parallel (tasks array, max 8). Subagents are read-only by default; set allowWrite to let one edit files. " +
      "If a subagent reports it needs input (NEEDS_INPUT), answer the questions and call again with `answers`.",
  },

  spawn: {
    flagEnv: "PI_SUBAGENT",
  },

  prompt: {
    snippet:
      "Delegate a task to a transient headless subagent (single or parallel) and get its results back",
    guidelines: [
      "Subagents are read-only unless you set allowWrite: true.",
      "If a result asks for input, answer the questions (ask the user if needed) and re-call with `answers` — do not guess.",
      "For any task requiring parallel execution or medium to large data gathering: delegate to a subagent, instruct it to use those tools, and get only the report back — never let batch/multi-output tools run directly in your session.",
    ],
    instructions: {
      always: "You are a transient subagent. Complete the task, then stop",
      readOnly:
        "You may only READ and EXPLORE. Do not modify files or run mutating commands. " +
        "When gathering data, prefer batch or parallel tools available in your session over sequential reads — " +
        "they keep raw output out of your context and let you return only the derived answer.",
      writeAllowed:
        "You may edit files ONLY if strictly necessary, preferring hash-anchored operations (replace/insert) over rewriting.",
    },
    needsInput: {
      marker: NEEDS_INPUT_MARKER,
      suffix: NEEDS_INPUT_SUFFIX,
    },
  },

  endorsement: {
    enabled: true,
  },

  orchestratorMode: {
    enabled: true,
  },

  limits: {
    maxPanelRows: MAX_PANEL_ROWS,
    maxConcurrency: MAX_CONCURRENCY,
    maxStoredOutput: MAX_STORED_OUTPUT,
    maxParallelTasks: MAX_PARALLEL_TASKS,
    perTaskOutputCap: PER_TASK_OUTPUT_CAP,
    maxWritesPerSubagent: MAX_WRITES_PER_SUBAGENT,
  },

  entries: {
    state: STATE_ENTRY,
    report: REPORT_ENTRY,
  },

  panel: {
    title: "  Subagents",
    widgetKey: WIDGET_KEY,
    toggleChord: PANEL_TOGGLE_CHORD,
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
};
