import type { SqliteDatabase } from "@leo-alvarenga/pi-sqlite";
import type { GoalRow, GoalIndexRow, EpicRow, MilestoneRow, ExecutionLogRow } from "../types";

export function getGoal(db: SqliteDatabase, id: string): GoalRow | null {
  return (db.select("goal", { id }) as GoalRow[])[0] ?? null;
}

export function insertGoal(db: SqliteDatabase, row: GoalRow): void {
  db.insert("goal", row as unknown as Record<string, unknown>);
}

export function updateGoalStatus(db: SqliteDatabase, id: string, status: string): void {
  db.update("goal", { status, updated_at: Date.now() } as any, { id } as any);
}

export function getGoalIndex(db: SqliteDatabase, id: string): GoalIndexRow | null {
  return (db.select("goals", { id }) as GoalIndexRow[])[0] ?? null;
}

export function insertGoalIndex(db: SqliteDatabase, row: GoalIndexRow): void {
  db.insert("goals", row as unknown as Record<string, unknown>);
}

export function updateGoalIndexStatus(db: SqliteDatabase, id: string, status: string): void {
  db.update("goals", { status, updated_at: Date.now() } as any, { id } as any);
}

export function listGoals(db: SqliteDatabase): GoalIndexRow[] {
  return db.select("goals") as GoalIndexRow[];
}

export function listEpics(db: SqliteDatabase, goalId: string): EpicRow[] {
  return db.select("epics", { goal_id: goalId }, { orderBy: { column: "order_index", direction: "ASC" } }) as EpicRow[];
}

export function getEpic(db: SqliteDatabase, id: string): EpicRow | null {
  return (db.select("epics", { id }) as EpicRow[])[0] ?? null;
}

export function insertEpic(db: SqliteDatabase, row: EpicRow): void {
  db.insert("epics", row as unknown as Record<string, unknown>);
}

export function updateEpic(db: SqliteDatabase, id: string, patch: Partial<EpicRow>): void {
  db.update("epics", { ...patch, updated_at: Date.now() } as any, { id } as any);
}

export function deleteEpic(db: SqliteDatabase, id: string): void {
  db.delete("epics", { id } as any);
}

export function listMilestones(db: SqliteDatabase, epicId: string): MilestoneRow[] {
  return db.select("milestones", { epic_id: epicId }, { orderBy: { column: "order_index", direction: "ASC" } }) as MilestoneRow[];
}

export function getMilestone(db: SqliteDatabase, id: string): MilestoneRow | null {
  return (db.select("milestones", { id }) as MilestoneRow[])[0] ?? null;
}

export function insertMilestone(db: SqliteDatabase, row: MilestoneRow): void {
  db.insert("milestones", row as unknown as Record<string, unknown>);
}

export function updateMilestone(db: SqliteDatabase, id: string, patch: Partial<MilestoneRow>): void {
  db.update("milestones", { ...patch, updated_at: Date.now() } as any, { id } as any);
}

export function deleteMilestone(db: SqliteDatabase, id: string): void {
  db.delete("milestones", { id } as any);
}

export function listMilestonesByGoal(db: SqliteDatabase): MilestoneRow[] {
  return db.select("milestones") as MilestoneRow[];
}

export type MilestoneWithEpic = MilestoneRow & { epic_title: string; epic_status: string };

export function getNextMilestone(db: SqliteDatabase): MilestoneWithEpic | null {
  const rows = db.raw<MilestoneWithEpic>(
    `SELECT m.*, e.title AS epic_title, e.status AS epic_status
     FROM milestones m
     JOIN epics e ON m.epic_id = e.id
     WHERE m.status = 'pending'
     ORDER BY e.order_index ASC, m.order_index ASC
     LIMIT 1`,
  );
  return rows[0] ?? null;
}

export function getOrphanedMilestones(db: SqliteDatabase): MilestoneRow[] {
  return db.select("milestones", { status: "in_progress" } as any) as MilestoneRow[];
}

export function isEpicComplete(db: SqliteDatabase, epicId: string): boolean {
  return db.count("milestones", { epic_id: epicId } as any) > 0 &&
    db.raw<{ c: number }>(
      "SELECT COUNT(*) AS c FROM milestones WHERE epic_id = ? AND status != 'completed'",
      [epicId],
    )[0].c === 0;
}

export function isGoalComplete(db: SqliteDatabase): boolean {
  const total = db.count("milestones");
  if (total === 0) return false;
  return db.raw<{ c: number }>(
    "SELECT COUNT(*) AS c FROM milestones WHERE status != 'completed'",
  )[0].c === 0;
}

export function acquireGoalLock(
  db: SqliteDatabase,
  goalId: string,
  sessionId: string,
): boolean {
  db.raw(
    "UPDATE goals SET lock_holder = ? WHERE id = ? AND (lock_holder = '' OR lock_holder IS NULL OR lock_holder = ?)",
    [sessionId, goalId, sessionId],
  );

  // raw() returns rows, not changes. Re-read to confirm lock was acquired.
  const row = db.select("goals", { id: goalId } as any)[0] as GoalIndexRow | undefined;
  return row?.lock_holder === sessionId;
}

export function releaseGoalLock(
  db: SqliteDatabase,
  goalId: string,
  sessionId: string,
): void {
  db.raw(
    "UPDATE goals SET lock_holder = '' WHERE id = ? AND lock_holder = ?",
    [goalId, sessionId],
  );
}

export function insertExecutionLog(db: SqliteDatabase, row: ExecutionLogRow): void {
  db.insert("execution_log", row as unknown as Record<string, unknown>);
}

export function updateExecutionLog(
  db: SqliteDatabase,
  id: string,
  patch: Partial<ExecutionLogRow>,
): void {
  db.update("execution_log", patch as any, { id } as any);
}

export function listExecutionLogs(
  db: SqliteDatabase,
  milestoneId: string,
): ExecutionLogRow[] {
  return db.raw<ExecutionLogRow>(
    "SELECT * FROM execution_log WHERE milestone_id = ? ORDER BY attempt DESC",
    [milestoneId],
  );
}

export function dbHasBlockingMilestones(db: SqliteDatabase): boolean {
  const blocked = db.raw<{ c: number }>(
    "SELECT COUNT(*) AS c FROM milestones WHERE status IN ('needs_input', 'failed')",
  )[0].c;
  return blocked > 0;
}

export type GoalStats = {
  epicTotal: number;
  epicDone: number;
  epicInProgress: number;
  msDone: number;
  msTotal: number;
};

export function getGoalStats(db: SqliteDatabase): GoalStats {
  const epics = db.select("epics") as Array<{ status: string }>;
  const milestones = db.select("milestones") as Array<{ status: string }>;

  return {
    epicTotal: epics.length,
    epicDone: epics.filter((e) => e.status === "completed").length,
    epicInProgress: epics.filter((e) => e.status === "in_progress").length,
    msDone: milestones.filter((m) => m.status === "completed").length,
    msTotal: milestones.length,
  };
}
