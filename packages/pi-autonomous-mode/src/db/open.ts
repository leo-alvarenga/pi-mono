import * as fs from "node:fs";
import * as path from "node:path";
import { SqliteDatabase } from "@leo-alvarenga/pi-sqlite";
import {
  GoalIndexSchema,
  GoalSchema,
  EpicSchema,
  MilestoneSchema,
} from "./schemas";

export function openIndexDb(agentDir: string): SqliteDatabase {
  const dir = path.join(agentDir, "autonomous");
  fs.mkdirSync(dir, { recursive: true });

  return new SqliteDatabase(path.join(dir, "index.db"), [
    { tableName: "goals", schema: GoalIndexSchema },
  ]);
}

export function openGoalDb(agentDir: string, goalId: string): SqliteDatabase {
  const dir = path.join(agentDir, "autonomous", goalId);
  fs.mkdirSync(dir, { recursive: true });

  return new SqliteDatabase(path.join(dir, "goal.db"), [
    { tableName: "goal", schema: GoalSchema },
    { tableName: "epics", schema: EpicSchema },
    { tableName: "milestones", schema: MilestoneSchema },
  ]);
}
