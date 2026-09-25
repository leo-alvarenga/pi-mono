import type { SqliteDatabase } from "@leo-alvarenga/pi-sqlite";
import { listMilestones } from "../db/queries";
import { ICONS } from "../constants";

export function renderProgress(db: SqliteDatabase): string {
  const epics = db.select("epics", undefined, {
    orderBy: { column: "order_index", direction: "ASC" },
  }) as Array<{
    id: string;
    title: string;
    status: string;
  }>;

  if (epics.length === 0) return "No epics defined yet";

  const lines: string[] = [];
  for (const epic of epics) {
    const milestones = listMilestones(db, epic.id);
    const done = milestones.filter((m) => m.status === "completed").length;

    lines.push(
      `### Epic: ${epic.title} [${epic.status}] (${done}/${milestones.length} milestones)`,
    );

    for (const m of milestones) {
      const icon = ICONS[m.status] ?? ICONS.needs_input;

      lines.push(
        `  ${icon} ${m.title} [${m.status}]${m.failure_reason ? ` | ${m.failure_reason}` : ""}`,
      );
    }

    lines.push("");
  }
  return lines.join("\n");
}
