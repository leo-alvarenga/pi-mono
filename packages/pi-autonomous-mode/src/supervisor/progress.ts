import type { SqliteDatabase } from "@leo-alvarenga/pi-sqlite";
import { listMilestones, listExecutionLogs } from "../db/queries";
import { ICONS } from "../constants";

function formatMs(ms: number): string {
  if (ms <= 0) return "n/a";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

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
  let totalDone = 0;
  let totalMs = 0;

  for (const epic of epics) {
    const milestones = listMilestones(db, epic.id);
    const done = milestones.filter((m) => m.status === "completed").length;
    totalDone += done;
    totalMs += milestones.length;

    lines.push(
      `### Epic: ${epic.title} [${epic.status}] (${done}/${milestones.length} milestones)`,
    );

    for (const m of milestones) {
      const icon = ICONS[m.status] ?? ICONS.needs_input;
      const logs = listExecutionLogs(db, m.id);
      const attempts = logs.length;

      let timing = "";
      if (logs.length > 0) {
        const latest = logs[0];
        const elapsed =
          latest.completed_at > 0 ? latest.completed_at - latest.started_at : Date.now() - latest.started_at;
        timing = ` · ${attempts} attempt${attempts === 1 ? "" : "s"} · ${formatMs(elapsed)}`;
      }

      lines.push(
        `  ${icon} ${m.title} [${m.status}]${timing}${m.failure_reason ? ` | ${m.failure_reason}` : ""}`,
      );
    }

    lines.push("");
  }

  lines.push(`_Progress: ${totalDone}/${totalMs} milestones completed_`);
  return lines.join("\n");
}
