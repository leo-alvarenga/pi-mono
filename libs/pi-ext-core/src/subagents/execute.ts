import type {
  AgentToolResult,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import { runHeadlessAgent } from "../headless/run";
import type { SessionRecordStore } from "../session/types";
import { mapWithConcurrencyLimit } from "../utils/concurrency";
import { truncateBytes } from "../utils/strings";

import { buildAllowlist, buildSystemPrompt, parseNeedsInput } from "./prompt";
import { classifyResult, singleContent, summarizeOutput } from "./result";
import { stateFinish, stateStart } from "./state";
import type {
  SubagentDetails,
  SubagentRecord,
  SubagentSpec,
  SubagentState,
} from "./types";

type ExecContext = {
  store: SessionRecordStore<SubagentState>;
  spec: SubagentSpec;
  ctx: ExtensionContext;
  signal?: AbortSignal;
};

type TaskParams = {
  task: string;
  cwd?: string;
  allowWrite?: boolean;
  answers?: string;
};

export async function handleSingle(
  ec: ExecContext,
  params: TaskParams,
): Promise<AgentToolResult<SubagentDetails>> {
  const record = stateStart(
    ec.store,
    ec.ctx,
    params.task,
    params.allowWrite ?? false,
    params.cwd,
  );

  const taskText = params.answers
    ? `Task: ${params.task}\n\nAnswers from the user:\n${params.answers}`
    : `Task: ${params.task}`;

  const run = await runHeadlessAgent({
    taskText,
    signal: ec.signal,
    bwrap: { ...ec.spec.bwrap, allowWrite: params.allowWrite ?? false },
    cwd: params.cwd ?? ec.ctx.cwd,
    spawnFlagEnv: ec.spec.spawnFlagEnv,
    tools: buildAllowlist(ec.spec, params.allowWrite ?? false),
    systemPrompt: buildSystemPrompt(ec.spec, params.allowWrite ?? false),
    parentSessionId: ec.ctx.sessionManager.getSessionId(),
  });

  const needsInput = parseNeedsInput(run.output, ec.spec.needsInput.marker);

  const status = classifyResult({
    exitCode: run.exitCode,
    stopReason: run.stopReason,
    needsInput: needsInput !== undefined,
  });

  const patch: Partial<SubagentRecord> = {
    status,
    questions: needsInput,
    finishedAt: Date.now(),
    tokens: run.usage.contextTokens,
    output: summarizeOutput(run.output, ec.spec.limits.maxStoredOutput),
    error:
      status === "failed"
        ? run.errorMessage || run.stderr.slice(0, 500) || undefined
        : undefined,
  };

  stateFinish(ec.store, ec.ctx, record.id, patch);
  const final = { ...record, ...patch };

  return {
    content: [{ type: "text", text: singleContent(final) }],
    details: { mode: "single", records: [final] } satisfies SubagentDetails,
  };
}

export async function handleParallel(
  ec: ExecContext,
  tasks: TaskParams[],
  onUpdate?: (update: AgentToolResult<unknown>) => void,
): Promise<AgentToolResult<SubagentDetails>> {
  const results: SubagentRecord[] = tasks.map((t) =>
    stateStart(ec.store, ec.ctx, t.task, t.allowWrite ?? false, t.cwd),
  );

  const makeDetails = (): SubagentDetails => ({
    mode: "parallel",
    records: [...results],
  });

  const emit = () => {
    const running = results.filter((r) => r.status === "running").length;
    const done = results.length - running;

    onUpdate?.({
      details: makeDetails(),
      content: [
        {
          type: "text",
          text: `Parallel: ${done}/${results.length} done, ${running} running…`,
        },
      ],
    });
  };

  await mapWithConcurrencyLimit(
    tasks,
    ec.spec.limits.maxConcurrency,
    async (t, index) => {
      const taskText = t.answers
        ? `Task: ${t.task}\n\nAnswers from the user:\n${t.answers}`
        : `Task: ${t.task}`;

      const run = await runHeadlessAgent({
        taskText,
        signal: ec.signal,
        bwrap: { ...ec.spec.bwrap, allowWrite: t.allowWrite ?? false },
        cwd: t.cwd ?? ec.ctx.cwd,
        spawnFlagEnv: ec.spec.spawnFlagEnv,
        tools: buildAllowlist(ec.spec, t.allowWrite ?? false),
        systemPrompt: buildSystemPrompt(ec.spec, t.allowWrite ?? false),
        parentSessionId: ec.ctx.sessionManager.getSessionId(),
      });

      const needsInput = parseNeedsInput(run.output, ec.spec.needsInput.marker);

      const status = classifyResult({
        exitCode: run.exitCode,
        stopReason: run.stopReason,
        needsInput: needsInput !== undefined,
      });

      const patch: Partial<SubagentRecord> = {
        status,
        questions: needsInput,
        finishedAt: Date.now(),
        tokens: run.usage.contextTokens,
        output: summarizeOutput(run.output, ec.spec.limits.maxStoredOutput),
        error:
          status === "failed"
            ? run.errorMessage || run.stderr.slice(0, 500) || undefined
            : undefined,
      };

      results[index] = { ...results[index], ...patch };
      stateFinish(ec.store, ec.ctx, results[index].id, patch);
      emit();
    },
  );

  const successCount = results.filter((r) => r.status === "completed").length;

  const sections = results.map((r) => {
    let body: string;

    switch (r.status) {
      case "completed":
        body = truncateBytes(r.output ?? "", ec.spec.limits.perTaskOutputCap);
        break;

      case "needs_input":
        body = `Needs input:\n${(r.questions ?? []).map((q) => `- ${q}`).join("\n")}`;
        break;

      default:
        body = r.error ?? "(no output)";
        break;
    }

    return `### #${r.id} ${r.status}\n${body}`;
  });

  let content = `Parallel: ${successCount}/${results.length} succeeded\n\n${sections.join("\n\n---\n\n")}`;
  const blocked = results.filter((r) => r.status === "needs_input");

  if (blocked.length > 0) {
    content += `\n\nSome subagents need input. Answer their questions, then call mini_subagent again with \`tasks\` for just those tasks (each with its own \`answers\`):\n`;
    content += blocked
      .map(
        (r) => `- #${r.id}: ${(r.questions ?? []).join(" / ") || "(unparsed)"}`,
      )
      .join("\n");
  }

  return {
    details: makeDetails(),
    content: [{ type: "text", text: content }],
  };
}
