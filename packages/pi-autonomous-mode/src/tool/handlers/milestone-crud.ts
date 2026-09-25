import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";
import type { AutonomousState, HandlerCtx } from "../../types";
import { openGoalDb } from "../../db/open";
import {
  insertMilestone,
  updateMilestone,
  deleteMilestone,
} from "../../db/queries";
import {
  writeMilestoneFile,
  deleteFile,
  updateMilestoneFile,
} from "../../files";

function requireGoal(
  store: SessionRecordStore<AutonomousState>,
  ctx: ExtensionContext,
) {
  const s = store.getState(ctx);
  if (!s.activeGoalId || !s.dbPath) throw new Error("No active goal");
  return s;
}

export async function handleMilestoneCreate(
  args: {
    epic_id: string;
    title: string;
    tasks?: string[];
    impl_notes?: string;
  },
  { ctx, store }: HandlerCtx,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const agentDir = getAgentDir();
  const s = requireGoal(store, ctx);
  const db = openGoalDb(agentDir, s.activeGoalId!);

  try {
    const existing = db.select("milestones", {
      epic_id: args.epic_id,
    }) as unknown as Array<{ order_index: number }>;

    const orderIndex = existing.length;
    const allEpics = db.select("epics") as Array<{
      id: string;
      order_index: number;
    }>;

    const now = Date.now();
    const msId = crypto.randomUUID();
    const epicIdx = allEpics.findIndex((e) => e.id === args.epic_id);

    const filePath = writeMilestoneFile(
      agentDir,
      s.activeGoalId!,
      epicIdx,
      orderIndex,
      args.title,
      args.tasks ?? [],
      args.impl_notes ?? "",
    );

    insertMilestone(db, {
      id: msId,
      retry_count: 0,
      created_at: now,
      executor_id: "",
      updated_at: now,
      title: args.title,
      status: "pending",
      failure_reason: "",
      file_path: filePath,
      epic_id: args.epic_id,
      order_index: orderIndex,
    });

    return {
      content: [
        {
          type: "text",
          text: `Milestone created: "${args.title}" (id: ${msId})`,
        },
      ],
    };
  } finally {
    db.close();
  }
}

export async function handleMilestoneUpdate(
  args: {
    id: string;
    status?: string;
    failure_reason?: string;
    executor_id?: string;
    tasks?: string[];
    impl_notes?: string;
  },
  { ctx, store }: HandlerCtx,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const s = requireGoal(store, ctx);
  const agentDir = getAgentDir();
  const db = openGoalDb(agentDir, s.activeGoalId!);
  try {
    const patch: Record<string, unknown> = {};
    if (args.status !== undefined) patch.status = args.status;
    if (args.failure_reason !== undefined)
      patch.failure_reason = args.failure_reason;
    if (args.executor_id !== undefined) patch.executor_id = args.executor_id;
    if (args.status === "failed" && args.failure_reason) {
      const ms = (
        db.select("milestones", { id: args.id }) as unknown as Array<{
          file_path: string;
          retry_count: number;
        }>
      )[0];
      if (ms) {
        updateMilestoneFile(
          ms.file_path,
          `\n## Failure (retry ${ms.retry_count + 1})\n\n${args.failure_reason}`,
        );
        patch.retry_count = ms.retry_count + 1;
      }
    }
    updateMilestone(db, args.id, patch as any);
    return {
      content: [{ type: "text", text: `Milestone updated: ${args.id}` }],
    };
  } finally {
    db.close();
  }
}

export async function handleMilestoneDelete(
  args: { id: string },
  { ctx, store }: HandlerCtx,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const s = requireGoal(store, ctx);
  const agentDir = getAgentDir();
  const db = openGoalDb(agentDir, s.activeGoalId!);
  try {
    const ms = (
      db.select("milestones", { id: args.id }) as unknown as Array<{
        file_path: string;
      }>
    )[0];
    if (ms) deleteFile(ms.file_path);
    deleteMilestone(db, args.id);
    return {
      content: [{ type: "text", text: `Milestone deleted: ${args.id}` }],
    };
  } finally {
    db.close();
  }
}
