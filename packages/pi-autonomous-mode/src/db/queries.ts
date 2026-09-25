import type { SqliteDatabase } from "@leo-alvarenga/pi-sqlite";
import type { GoalRow, GoalIndexRow, EpicRow, MilestoneRow } from "../types";

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
