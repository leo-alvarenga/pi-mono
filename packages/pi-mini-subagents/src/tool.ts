import { Type } from "typebox";
import type {
  AgentToolResult,
  ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

import {
  MAX_CONCURRENCY,
  MAX_PARALLEL_TASKS,
  PER_TASK_OUTPUT_CAP,
} from "./constants";
import {
  classifyResult,
  parseNeedsInput,
  summarizeOutput,
  truncateBytes,
} from "./core";
import { runSubagent } from "./spawn";
import type { SubagentStore } from "./state";
import type { SubagentDetails, SubagentRecord } from "./types";

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

const MiniSubagentParams = Type.Object({
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

async function mapWithConcurrencyLimit<TIn, TOut>(
  items: TIn[],
  concurrency: number,
  fn: (item: TIn, index: number) => Promise<TOut>,
): Promise<TOut[]> {
  if (items.length === 0) return [];

  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<TOut>(items.length);

  let next = 0;
  const workers = new Array(limit).fill(null).map(async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });

  await Promise.all(workers);
  return results;
}

function needsInputContent(r: SubagentRecord): string {
  const qs = (r.questions ?? []).map((q) => `- ${q}`).join("\n");

  return `The subagent needs input to complete this task.\n\nQuestions:\n${qs || "- (unparsed)"}\n\nAsk the user (or answer from context), then call mini_subagent again with the same \`task\` and your answers in \`answers\`.`;
}

function singleContent(r: SubagentRecord): string {
  if (r.status === "needs_input") return needsInputContent(r);

  if (r.status === "failed") {
    return `Subagent failed: ${r.error ?? r.output ?? "(no output)"}`;
  }

  return r.output ?? "(no output)";
}

export function registerMiniSubagentTool(
  pi: ExtensionAPI,
  store: SubagentStore,
): void {
  pi.registerTool({
    name: "mini_subagent",
    label: "Mini Subagent",
    parameters: MiniSubagentParams,
    description:
      "Delegate a task to a transient headless subagent (a separate pi process) and get its findings back. " +
      "Modes: single (task) or parallel (tasks array, max 8). Subagents are read-only by default; set allowWrite to let one edit files. " +
      "If a subagent reports it needs input (NEEDS_INPUT), answer the questions and call again with `answers`.",
    promptSnippet:
      "Delegate a task to a transient read-only subagent (single or parallel)",
    promptGuidelines: [
      "Subagents are read-only unless you set allowWrite: true.",
      "If a result asks for input, answer the questions (ask the user if needed) and re-call with `answers` — do not guess.",
    ],

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

      // single mode
      if (hasSingle) {
        const record = store.start(
          ctx,
          params.task!,
          params.allowWrite ?? false,
          params.cwd,
        );

        const run = await runSubagent({
          cwd: params.cwd ?? ctx.cwd,
          task: params.task!,
          allowWrite: params.allowWrite ?? false,
          answers: params.answers,
          signal,
        });

        const needsInput = parseNeedsInput(run.output);

        const status = classifyResult({
          exitCode: run.exitCode,
          stopReason: run.stopReason,
          needsInput: needsInput !== undefined,
        });

        const patch: Partial<SubagentRecord> = {
          status,
          output: summarizeOutput(run.output),
          tokens: run.usage.contextTokens,
          questions: needsInput,
          error:
            status === "failed"
              ? run.errorMessage || run.stderr.slice(0, 500) || undefined
              : undefined,
          finishedAt: Date.now(),
        };

        store.finish(ctx, record.id, patch);
        const final = { ...record, ...patch };

        return {
          content: [{ type: "text", text: singleContent(final) }],
          details: {
            mode: "single",
            records: [final],
          } satisfies SubagentDetails,
        };
      }

      // parallel mode
      const tasks = params.tasks!;
      if (tasks.length > MAX_PARALLEL_TASKS) {
        return errorResult(
          `Too many parallel tasks (${tasks.length}). Max is ${MAX_PARALLEL_TASKS}.`,
        );
      }

      const results: SubagentRecord[] = tasks.map((t) =>
        store.start(ctx, t.task, t.allowWrite ?? false, t.cwd),
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
        MAX_CONCURRENCY,
        async (t, index) => {
          const run = await runSubagent({
            cwd: t.cwd ?? ctx.cwd,
            task: t.task,
            allowWrite: t.allowWrite ?? false,
            answers: t.answers,
            signal,
          });
          const needsInput = parseNeedsInput(run.output);
          const status = classifyResult({
            exitCode: run.exitCode,
            stopReason: run.stopReason,
            needsInput: needsInput !== undefined,
          });
          const patch: Partial<SubagentRecord> = {
            status,
            output: summarizeOutput(run.output),
            tokens: run.usage.contextTokens,
            questions: needsInput,
            error:
              status === "failed"
                ? run.errorMessage || run.stderr.slice(0, 500) || undefined
                : undefined,
            finishedAt: Date.now(),
          };
          results[index] = { ...results[index], ...patch };
          store.finish(ctx, results[index].id, patch);
          emit();
        },
      );

      const successCount = results.filter(
        (r) => r.status === "completed",
      ).length;
      const sections = results.map((r) => {
        let body: string;
        if (r.status === "completed")
          body = truncateBytes(r.output ?? "", PER_TASK_OUTPUT_CAP);
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

      return {
        content: [{ type: "text", text: content }],
        details: makeDetails(),
      };
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
}
