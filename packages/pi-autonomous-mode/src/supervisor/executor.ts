import * as fs from "node:fs";
import { runHeadlessAgent } from "@leo-alvarenga/pi-ext-core";
import type { HeadlessRunResult } from "@leo-alvarenga/pi-ext-core";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import { SPAWN_GUARD_ENV } from "../constants";
import type { GoalRow, MilestoneRow } from "../types";
import { buildExecutorPrompt } from "./executor-prompt";

export type ExecutorResult = {
  raw: HeadlessRunResult;
  milestoneId: string;
};

function readMilestoneFile(filePath: string): { tasks: string[]; implNotes: string } {
  if (!fs.existsSync(filePath)) return { tasks: [], implNotes: "" };

  const content = fs.readFileSync(filePath, "utf8");
  const tasks: string[] = [];
  let implNotes = "";
  let inTasks = false;
  let inNotes = false;

  for (const line of content.split("\n")) {
    if (line.startsWith("## Tasks")) { inTasks = true; inNotes = false; continue; }
    if (line.startsWith("## Implementation")) { inNotes = true; inTasks = false; continue; }
    if (line.startsWith("## ")) { inTasks = false; inNotes = false; continue; }

    if (inTasks && line.startsWith("- ")) tasks.push(line.slice(2).trim());
    if (inNotes) implNotes += line + "\n";
  }

  return { tasks, implNotes: implNotes.trim() };
}

export async function spawnExecutor(
  milestone: MilestoneRow & { epic_title: string },
  goal: GoalRow,
  ctx: ExtensionContext,
  opts?: { previousFailure?: string; answers?: string },
): Promise<ExecutorResult> {
  const { tasks, implNotes } = readMilestoneFile(milestone.file_path);

  const taskText = buildExecutorPrompt({
    cwd: goal.cwd,
    tasks,
    implNotes,
    goalTitle: goal.title,
    goalDescription: goal.description,
    epicTitle: milestone.epic_title,
    milestoneTitle: milestone.title,
    previousFailure: opts?.previousFailure,
    answers: opts?.answers,
  });

  const raw = await runHeadlessAgent({
    taskText,
    cwd: goal.cwd,
    tools: null,
    spawnFlagEnv: SPAWN_GUARD_ENV,
    systemPrompt: "You are an autonomous executor. Complete the assigned milestone tasks.",
    parentSessionId: ctx.sessionManager.getSessionId(),
    bwrap: { allowWrite: true },
  });

  return { raw, milestoneId: milestone.id };
}
