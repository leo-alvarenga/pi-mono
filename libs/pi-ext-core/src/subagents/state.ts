import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

import type { SessionRecordStore } from "../session/types";

import type { SubagentRecord, SubagentSpec, SubagentState } from "./types";

export function stateStart(
  store: SessionRecordStore<SubagentState>,
  ctx: ExtensionContext,
  task: string,
  allowWrite: boolean,
  cwd?: string,
): SubagentRecord {
  const s = store.getState(ctx);

  const record: SubagentRecord = {
    cwd,
    task,
    allowWrite,
    id: s.nextId,
    status: "running",
    startedAt: Date.now(),
  };

  store.commit(ctx, {
    nextId: s.nextId + 1,
    records: [...s.records, record],
  });

  return record;
}

export function stateFinish(
  store: SessionRecordStore<SubagentState>,
  ctx: ExtensionContext,
  id: number,
  patch: Partial<SubagentRecord>,
): void {
  const s = store.getState(ctx);

  store.commit(ctx, {
    nextId: s.nextId,
    records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  });
}

export function renderReport(
  s: { records: SubagentRecord[] },
  theme: Theme,
  spec: SubagentSpec,
): string {
  if (s.records.length === 0) return `  ${theme.fg("dim", "No subagents.")}`;

  const lines: string[] = [];

  for (const section of spec.reportSections({
    records: s.records,
    nextId: 0,
  })) {
    if (section.records.length === 0) continue;

    lines.push(
      `  ${theme.fg("muted", `${section.label} (${section.records.length})`)}`,
    );

    for (const r of section.records) {
      lines.push(spec.rowLine(r, theme));
    }

    lines.push("");
  }

  return lines.join("\n");
}
