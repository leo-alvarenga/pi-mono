import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import type { AutonomousState, HandlerCtx } from "../../types";
import { openGoalDb } from "../../db/open";
import {
  insertEpic,
  updateEpic,
  deleteEpic,
  listMilestones,
  deleteMilestone,
} from "../../db/queries";
import { writeEpicFile, deleteFile } from "../../files";

function requireGoal(
  store: SessionRecordStore<AutonomousState>,
  ctx: ExtensionContext,
) {
  const s = store.getState(ctx);
  if (!s.activeGoalId || !s.dbPath) throw new Error("No active goal");

  return s;
}

export async function handleEpicCreate(
  args: { title: string; acceptance_criteria?: string[] },
  { ctx, store }: HandlerCtx,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const agentDir = getAgentDir();
  const s = requireGoal(store, ctx);

  const db = openGoalDb(agentDir, s.activeGoalId!);

  try {
    const existing = db.select("epics") as Array<{ order_index: number }>;
    const orderIndex = existing.length;

    const epicId = crypto.randomUUID();
    const now = Date.now();

    const filePath = writeEpicFile(
      agentDir,
      s.activeGoalId!,
      orderIndex,
      args.title,
      args.acceptance_criteria ?? [],
    );

    insertEpic(db, {
      id: epicId,
      created_at: now,
      updated_at: now,
      title: args.title,
      status: "pending",
      file_path: filePath,
      order_index: orderIndex,
      goal_id: s.activeGoalId!,
    });

    return {
      content: [
        { type: "text", text: `Epic created: "${args.title}" (id: ${epicId})` },
      ],
    };
  } finally {
    db.close();
  }
}

export async function handleEpicUpdate(
  args: {
    id: string;
    title?: string;
    status?: string;
    acceptance_criteria?: string[];
  },
  { ctx, store }: HandlerCtx,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const agentDir = getAgentDir();
  const s = requireGoal(store, ctx);
  const db = openGoalDb(agentDir, s.activeGoalId!);

  try {
    const patch: Record<string, unknown> = {};

    if (args.title) patch.title = args.title;
    if (args.status) patch.status = args.status;

    updateEpic(db, args.id, patch as any);

    return { content: [{ type: "text", text: `Epic updated: ${args.id}` }] };
  } finally {
    db.close();
  }
}

export async function handleEpicDelete(
  args: { id: string },
  { ctx, store }: HandlerCtx,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const s = requireGoal(store, ctx);
  const agentDir = getAgentDir();
  const db = openGoalDb(agentDir, s.activeGoalId!);

  try {
    const milestones = listMilestones(db, args.id);

    for (const m of milestones) {
      deleteFile(m.file_path);
      deleteMilestone(db, m.id);
    }

    const epic = (
      db.select("epics", { id: args.id }) as unknown as Array<{
        file_path: string;
      }>
    )[0];

    if (epic) deleteFile(epic.file_path);

    deleteEpic(db, args.id);

    return {
      content: [
        {
          type: "text",
          text: `Epic deleted: ${args.id} (${milestones.length} milestones removed)`,
        },
      ],
    };
  } finally {
    db.close();
  }
}
