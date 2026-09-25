import { classifyResult, summarizeOutput } from "@leo-alvarenga/pi-ext-core";
import { parseNeedsInput } from "@leo-alvarenga/pi-ext-core";
import type { SubagentStatus } from "@leo-alvarenga/pi-ext-core";
import type { SqliteDatabase } from "@leo-alvarenga/pi-sqlite";

import { NEEDS_INPUT_MARKER, MAX_MILESTONE_RETRIES } from "../constants";
import { updateMilestone, updateEpic, isEpicComplete, isGoalComplete } from "../db/queries";
import type { ExecutorResult } from "./executor";

export type CollectedResult = {
  status: SubagentStatus;
  questions?: string[];
  outputSummary: string;
  error?: string;
  retriable: boolean;
  epicComplete: boolean;
  goalComplete: boolean;
};

export function collectResult(
  db: SqliteDatabase,
  result: ExecutorResult,
  currentRetryCount: number,
  epicId: string,
): CollectedResult {
  const { raw } = result;

  const needsInput = parseNeedsInput(raw.output, NEEDS_INPUT_MARKER);

  const status = classifyResult({
    exitCode: raw.exitCode,
    stopReason: raw.stopReason,
    needsInput: needsInput !== undefined,
  });

  const outputSummary = summarizeOutput(raw.output, 2000);
  const error = status === "failed"
    ? raw.errorMessage || raw.stderr.slice(0, 500) || undefined
    : undefined;

  const milestoneStatus = status === "needs_input" ? "needs_input" : status;

  if (status === "completed") {
    updateMilestone(db, result.milestoneId, { status: "completed" });

    const epicDone = isEpicComplete(db, epicId);
    if (epicDone) updateEpic(db, epicId, { status: "completed" });

    return {
      status, outputSummary, error,
      retriable: false,
      epicComplete: epicDone,
      goalComplete: epicDone && isGoalComplete(db),
    };
  }

  if (status === "failed") {
    const retriable = currentRetryCount < MAX_MILESTONE_RETRIES;

    if (retriable) {
      updateMilestone(db, result.milestoneId, {
        status: "pending",
        retry_count: currentRetryCount + 1,
        failure_reason: error ?? "unknown",
      });
    } else {
      updateMilestone(db, result.milestoneId, {
        status: "failed",
        failure_reason: error ?? "max retries exceeded",
      });
      updateEpic(db, epicId, { status: "failed" });
    }

    return {
      status, outputSummary, error, questions: needsInput,
      retriable,
      epicComplete: false,
      goalComplete: false,
    };
  }

  // needs_input
  updateMilestone(db, result.milestoneId, {
    status: milestoneStatus as any,
    failure_reason: (needsInput ?? []).join(" | "),
  });

  return {
    status, outputSummary, error,
    questions: needsInput,
    retriable: false,
    epicComplete: false,
    goalComplete: false,
  };
}
