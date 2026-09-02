import { basename } from "node:path";

import type { Notifier } from "./notifier";

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return s < 1 ? "<1s" : `${s}s`;

  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;

  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export class RunTracker {
  private running = false;
  private startedAt = 0;

  constructor(
    private readonly enabled: () => boolean,
    private readonly notifier: Notifier,
    private readonly cwd: () => string,
  ) {}

  begin(): void {
    this.running = true;
    this.startedAt = Date.now();
  }

  settle(label: string): void {
    if (!this.running) return;

    this.running = false;
    if (!this.enabled()) return;

    const project = basename(this.cwd()) || "?";
    const elapsed = formatDuration(Date.now() - this.startedAt);
    this.notifier.notify(`Pi ${label} done`, `Finished in ${elapsed} · ${project}`);
  }
}
