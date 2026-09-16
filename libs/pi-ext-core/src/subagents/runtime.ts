import type {
  AgentToolResult,
  ExtensionAPI,
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import type { KeyId } from "@earendil-works/pi-tui";
import { Type } from "typebox";

import { killAllRunning, runHeadlessAgent } from "../headless/run";
import { createSessionStore } from "../session/store";
import { createPanelWidget } from "../tui/panel";
import { truncateBytes, truncateChars } from "../utils/strings";
import { mapWithConcurrencyLimit } from "../utils/concurrency";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubagentStatus = "running" | "completed" | "failed" | "needs_input";

export interface SubagentRecord {
  id: number;
  task: string;
  cwd?: string;
  startedAt: number;
  allowWrite: boolean;
  finishedAt?: number;
  status: SubagentStatus;
  output?: string;
  tokens?: number;
  error?: string;
  questions?: string[];
}

export interface SubagentState {
  records: SubagentRecord[];
  nextId: number;
}

export interface SubagentDetails {
  mode: "single" | "parallel";
  records: SubagentRecord[];
}

// ─── Spec ────────────────────────────────────────────────────────────────────

export interface SubagentSpec {
  /** Env flag name set on child processes to prevent re-entry (e.g. "PI_SUBAGENT"). */
  spawnFlagEnv: string;
  toolName: string;
  toolLabel: string;
  toolDescription: string;
  promptSnippet: string;
  promptGuidelines: string[];
  promptInstructions: {
    always: string;
    readOnly: string;
    writeAllowed: string;
  };
  needsInput: {
    marker: string;
    /** Full suffix block appended to system prompt (includes the marker template). */
    suffix: string;
  };
  allowlists: {
    readOnly: string[];
    writeable: string[];
  };
  limits: {
    maxParallelTasks: number;
    maxConcurrency: number;
    perTaskOutputCap: number;
    maxStoredOutput: number;
    maxPanelRows: number;
  };
  state: { entryType: string };
  report: { entryType: string };
  panel: {
    widgetKey: string;
    toggleChord: KeyId;
    title: string;
    emptyText: string;
  };
  /** Render a single record row for the TUI panel and /command report. */
  rowLine(record: SubagentRecord, theme: Theme): string;
  /** Group records into labelled sections for the /command report. */
  reportSections(
    s: SubagentState,
  ): Array<{ label: string; records: SubagentRecord[] }>;
}

// ─── Helpers (exported for spec wiring smoke tests) ──────────────────────────

/** Consumer: pi-mini-subagents. */
export function buildSystemPrompt(
  spec: Pick<SubagentSpec, "promptInstructions" | "needsInput">,
  allowWrite: boolean,
): string {
  let prompt = spec.promptInstructions.always;
  if (!allowWrite) prompt += `\n\n${spec.promptInstructions.readOnly}`;
  else prompt += `\n\n${spec.promptInstructions.writeAllowed}`;
  return `${prompt}\n\n${spec.needsInput.suffix}`;
}

/** Consumer: pi-mini-subagents. */
export function buildAllowlist(
  spec: Pick<SubagentSpec, "allowlists">,
  allowWrite: boolean,
): string[] {
  return allowWrite ? spec.allowlists.writeable : spec.allowlists.readOnly;
}

/**
 * Extract NEEDS_INPUT questions from a subagent's final message.
 * Returns undefined when the marker is absent, [] when present with no bullets.
 * Consumer: pi-mini-subagents.
 */
export function parseNeedsInput(
  text: string,
  marker: string,
): string[] | undefined {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.trim() === marker);
  if (idx === -1) return undefined;

  const questions: string[] = [];
  for (const line of lines.slice(idx + 1)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      const q = trimmed.slice(2).trim();
      if (q) questions.push(q);
    } else if (trimmed === "") {
      continue;
    } else {
      break;
    }
  }
  return questions;
}

/** Consumer: pi-mini-subagents. */
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
  )
    return "failed";
  return "completed";
}

/** Consumer: pi-mini-subagents. */
export function summarizeOutput(text: string, maxChars: number): string {
  return truncateChars(text, maxChars);
}

// ─── Runtime ─────────────────────────────────────────────────────────────────

const TaskItem = Type.Object({
  task: Type.String({ description: "Task to delegate to a subagent" }),
  allowWrite: Type.Optional(
    Type.Boolean({
      description: "Allow the subagent to edit files. Default: false.",
    }),
  ),
  answers: Type.Optional(
    Type.String({
      description: "Answers to a prior NEEDS_INPUT, for re-spawn of this task",
    }),
  ),
  cwd: Type.Optional(
    Type.String({ description: "Working directory for this subagent" }),
  ),
});

const SubagentParams = Type.Object({
  task: Type.Optional(
    Type.String({ description: "Task to delegate (single mode)" }),
  ),
  tasks: Type.Optional(
    Type.Array(TaskItem, {
      description: "Tasks to delegate in parallel (max 8)",
    }),
  ),
  allowWrite: Type.Optional(
    Type.Boolean({
      description: "Allow write for single mode. Default: false.",
    }),
  ),
  answers: Type.Optional(
    Type.String({
      description: "Answers to a prior NEEDS_INPUT (single mode re-spawn)",
    }),
  ),
  cwd: Type.Optional(
    Type.String({ description: "Working directory (single mode)" }),
  ),
});

function needsInputContent(r: SubagentRecord): string {
  const qs = (r.questions ?? []).map((q) => `- ${q}`).join("\n");
  return `The subagent needs input to complete this task.\n\nQuestions:\n${qs || "- (unparsed)"}\n\nAsk the user (or answer from context), then call mini_subagent again with the same \`task\` and your answers in \`answers\`.`;
}

function singleContent(r: SubagentRecord): string {
  if (r.status === "needs_input") return needsInputContent(r);
  if (r.status === "failed") return `Subagent failed: ${r.error ?? r.output ?? "(no output)"}`;
  return r.output ?? "(no output)";
}

function stateStart(
  store: ReturnType<typeof createSessionStore<SubagentState>>,
  ctx: ExtensionContext,
  task: string,
  allowWrite: boolean,
  cwd?: string,
): SubagentRecord {
  const s = store.getState(ctx);
  const record: SubagentRecord = {
    id: s.nextId,
    task,
    status: "running",
    allowWrite,
    cwd,
    startedAt: Date.now(),
  };
  store.commit(ctx, {
    records: [...s.records, record],
    nextId: s.nextId + 1,
  });
  return record;
}

function stateFinish(
  store: ReturnType<typeof createSessionStore<SubagentState>>,
  ctx: ExtensionContext,
  id: number,
  patch: Partial<SubagentRecord>,
): void {
  const s = store.getState(ctx);
  store.commit(ctx, {
    records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    nextId: s.nextId,
  });
}

function renderReport(
  s: { records: SubagentRecord[] },
  theme: Theme,
  spec: SubagentSpec,
): string {
  if (s.records.length === 0) return `  ${theme.fg("dim", "No subagents.")}`;

  const lines: string[] = [];
  for (const section of spec.reportSections({ records: s.records, nextId: 0 })) {
    if (section.records.length === 0) continue;
    lines.push(
      `  ${theme.fg("muted", `${section.label} (${section.records.length})`)}`,
    );
    for (const r of section.records) {
      lines.push(spec.rowLine(r, theme));
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Register the subagent tool, command, panel, and session event handlers.
 * Consumer: pi-mini-subagents.
 */
export function createSubagentRuntime(
  pi: ExtensionAPI,
  spec: SubagentSpec,
): void {
  let panel: { refresh(ctx: ExtensionContext): void; register(): void } | undefined;

  const store = createSessionStore<SubagentState>({
    entryType: spec.state.entryType,
    empty: () => ({ records: [], nextId: 1 }),
    snapshotOf: (entry) => {
      const d = entry.data as SubagentState | undefined;
      return d
        ? {
            records: d.records.filter((r) => r.status !== "running"),
            nextId: d.nextId,
          }
        : undefined;
    },
    onChange: (snapshot, ctx) => {
      if (snapshot.records.length > 0)
        pi.appendEntry(spec.state.entryType, snapshot);
      panel?.refresh(ctx);
    },
  });

  panel = createPanelWidget<SubagentState>(pi, {
    widgetKey: spec.panel.widgetKey,
    toggleChord: spec.panel.toggleChord,
    store,
    isEmpty: (s) => s.records.length === 0,
    header: (s, theme, isCollapsed) => {
      const running = s.records.filter((r) => r.status === "running").length;
      const done = s.records.length - running;
      const icon = isCollapsed ? "󰅂" : "󰅀";
      return theme.fg(
        "accent",
        `${icon}   ${spec.panel.title} | ${running} running / ${done} done`,
      );
    },
    rows: (s, theme) => {
      const running = s.records.filter((r) => r.status === "running");
      const finished = s.records.filter((r) => r.status !== "running");
      return [...running, ...finished].map((r) => spec.rowLine(r, theme));
    },
    maxRows: spec.limits.maxPanelRows,
    emptyText: spec.panel.emptyText,
    moreLabel: (n) => `… +${n} more`,
  });

  panel.register();

  // tool
  pi.registerTool({
    name: spec.toolName,
    label: spec.toolLabel,
    parameters: SubagentParams,
    description: spec.toolDescription,
    promptSnippet: spec.promptSnippet,
    promptGuidelines: spec.promptGuidelines,

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const hasTasks = (params.tasks?.length ?? 0) > 0;
      const hasSingle = Boolean(params.task);
      const modeCount = Number(hasTasks) + Number(hasSingle);

      const errorResult = (text: string): AgentToolResult<SubagentDetails> => ({
        content: [{ type: "text", text }],
        details: { mode: hasTasks ? "parallel" : "single", records: [] },
      });

      if (modeCount !== 1) {
        return errorResult(
          "Provide exactly one of `task` (single) or `tasks` (parallel).",
        );
      }

      if (hasSingle) {
        const record = stateStart(
          store,
          ctx,
          params.task!,
          params.allowWrite ?? false,
          params.cwd,
        );

        const taskText = params.answers
          ? `Task: ${params.task!}\n\nAnswers from the user:\n${params.answers}`
          : `Task: ${params.task!}`;

        const run = await runHeadlessAgent({
          cwd: params.cwd ?? ctx.cwd,
          taskText,
          systemPrompt: buildSystemPrompt(spec, params.allowWrite ?? false),
          tools: buildAllowlist(spec, params.allowWrite ?? false),
          spawnFlagEnv: spec.spawnFlagEnv,
          signal,
        });

        const needsInput = parseNeedsInput(run.output, spec.needsInput.marker);
        const status = classifyResult({
          exitCode: run.exitCode,
          stopReason: run.stopReason,
          needsInput: needsInput !== undefined,
        });

        const patch: Partial<SubagentRecord> = {
          status,
          output: summarizeOutput(run.output, spec.limits.maxStoredOutput),
          tokens: run.usage.contextTokens,
          questions: needsInput,
          error:
            status === "failed"
              ? run.errorMessage || run.stderr.slice(0, 500) || undefined
              : undefined,
          finishedAt: Date.now(),
        };

        stateFinish(store, ctx, record.id, patch);
        const final = { ...record, ...patch };

        return {
          content: [{ type: "text", text: singleContent(final) }],
          details: { mode: "single", records: [final] } satisfies SubagentDetails,
        };
      }

      // parallel mode
      const tasks = params.tasks!;
      if (tasks.length > spec.limits.maxParallelTasks) {
        return errorResult(
          `Too many parallel tasks (${tasks.length}). Max is ${spec.limits.maxParallelTasks}.`,
        );
      }

      const results: SubagentRecord[] = tasks.map((t) =>
        stateStart(store, ctx, t.task, t.allowWrite ?? false, t.cwd),
      );

      const makeDetails = (): SubagentDetails => ({
        mode: "parallel",
        records: [...results],
      });

      const emit = () => {
        const running = results.filter((r) => r.status === "running").length;
        const done = results.length - running;
        onUpdate?.({
          content: [
            {
              type: "text",
              text: `Parallel: ${done}/${results.length} done, ${running} running…`,
            },
          ],
          details: makeDetails(),
        });
      };

      await mapWithConcurrencyLimit(
        tasks,
        spec.limits.maxConcurrency,
        async (t, index) => {
          const taskText = t.answers
            ? `Task: ${t.task}\n\nAnswers from the user:\n${t.answers}`
            : `Task: ${t.task}`;

          const run = await runHeadlessAgent({
            cwd: t.cwd ?? ctx.cwd,
            taskText,
            systemPrompt: buildSystemPrompt(spec, t.allowWrite ?? false),
            tools: buildAllowlist(spec, t.allowWrite ?? false),
            spawnFlagEnv: spec.spawnFlagEnv,
            signal,
          });

          const needsInput = parseNeedsInput(run.output, spec.needsInput.marker);
          const status = classifyResult({
            exitCode: run.exitCode,
            stopReason: run.stopReason,
            needsInput: needsInput !== undefined,
          });

          const patch: Partial<SubagentRecord> = {
            status,
            output: summarizeOutput(run.output, spec.limits.maxStoredOutput),
            tokens: run.usage.contextTokens,
            questions: needsInput,
            error:
              status === "failed"
                ? run.errorMessage || run.stderr.slice(0, 500) || undefined
                : undefined,
            finishedAt: Date.now(),
          };

          results[index] = { ...results[index], ...patch };
          stateFinish(store, ctx, results[index].id, patch);
          emit();
        },
      );

      const successCount = results.filter(
        (r) => r.status === "completed",
      ).length;

      const sections = results.map((r) => {
        let body: string;
        if (r.status === "completed")
          body = truncateBytes(r.output ?? "", spec.limits.perTaskOutputCap);
        else if (r.status === "needs_input")
          body = `Needs input:\n${(r.questions ?? []).map((q) => `- ${q}`).join("\n")}`;
        else body = r.error ?? "(no output)";
        return `### #${r.id} ${r.status}\n${body}`;
      });

      let content = `Parallel: ${successCount}/${results.length} succeeded\n\n${sections.join("\n\n---\n\n")}`;
      const blocked = results.filter((r) => r.status === "needs_input");
      if (blocked.length > 0) {
        content += `\n\nSome subagents need input. Answer their questions, then call mini_subagent again with \`tasks\` for just those tasks (each with its own \`answers\`):\n`;
        content += blocked
          .map(
            (r) =>
              `- #${r.id}: ${(r.questions ?? []).join(" / ") || "(unparsed)"}`,
          )
          .join("\n");
      }

      return { content: [{ type: "text", text: content }], details: makeDetails() };
    },

    renderCall(args, theme) {
      if (args.tasks && args.tasks.length > 0) {
        let text =
          theme.fg("toolTitle", theme.bold("mini_subagent ")) +
          theme.fg("accent", `parallel (${args.tasks.length} tasks)`);
        for (const t of args.tasks.slice(0, 3)) {
          const preview =
            t.task.length > 40 ? `${t.task.slice(0, 40)}…` : t.task;
          text += `\n  ${theme.fg("dim", preview)}${t.allowWrite ? theme.fg("warning", " ✎") : ""}`;
        }
        if (args.tasks.length > 3)
          text += `\n  ${theme.fg("muted", `… +${args.tasks.length - 3} more`)}`;
        return new Text(text, 0, 0);
      }

      const preview = args.task
        ? args.task.length > 60
          ? `${args.task.slice(0, 60)}…`
          : args.task
        : "...";
      let text =
        theme.fg("toolTitle", theme.bold("mini_subagent ")) +
        theme.fg("dim", preview);
      if (args.allowWrite) text += theme.fg("warning", " ✎");
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as SubagentDetails | undefined;
      const text =
        result.content[0]?.type === "text" ? result.content[0].text : "";
      const statuses = details?.records.map((r) => r.status) ?? [];
      const color = statuses.includes("failed")
        ? "error"
        : statuses.includes("needs_input")
          ? "warning"
          : "muted";
      return new Text(theme.fg(color, text), 0, 0);
    },
  });

  // command
  pi.registerCommand(spec.toolName + "s", {
    description: "Show all subagents grouped by status",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify(`/${spec.toolName}s requires interactive mode`, "error");
        return;
      }
      pi.appendEntry(spec.report.entryType, {
        records: [...store.getState(ctx).records],
      });
    },
  });

  pi.registerEntryRenderer<{ records: SubagentRecord[] }>(
    spec.report.entryType,
    (entry, _options, theme) =>
      new Text(renderReport(entry.data ?? { records: [] as SubagentRecord[] }, theme, spec), 0, 0),
  );

  // session events
  pi.on("session_start", (_event, ctx) => store.replay(ctx));
  pi.on("session_tree", (_event, ctx) => store.replay(ctx));
  pi.on("session_before_compact", (_event, ctx) =>
    store.persistSnapshot(ctx),
  );
  pi.on("session_shutdown", (_event, ctx) => {
    killAllRunning();
    if (ctx.hasUI) ctx.ui.setWidget(spec.panel.widgetKey, undefined);
  });
}
