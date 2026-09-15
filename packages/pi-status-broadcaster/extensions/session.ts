import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import type {
  SessionEntry,
  SessionStatus,
  TodoReport,
  TokenReport,
} from "./types";

// This is here for a possible future integration with @leo-alvarenga/pi-todo-list
const EMPTY_TODOS: TodoReport = { done: 0, created: 0, inProgress: 0 };

function getTokens(ctx: ExtensionContext): TokenReport {
  const usage = ctx.getContextUsage();

  let input = 0,
    output = 0;

  for (const entry of ctx.sessionManager.getEntries()) {
    const u =
      (entry as { usage?: { input?: number; output?: number } }).usage ??
      (entry as { message?: { usage?: { input?: number; output?: number } } })
        .message?.usage;

    if (!u) continue;

    input += u.input ?? 0;
    output += u.output ?? 0;
  }

  return { total: usage?.tokens ?? 0, input, output };
}

export function buildEntry(
  ctx: ExtensionContext,
  opts: {
    id: string;
    createdAt: string;
    resumedAt?: string;
    status: SessionStatus;
    name?: string;
  },
): SessionEntry {
  const model = ctx.model;

  return {
    id: opts.id,
    cwd: ctx.cwd,
    ...(opts.name ? { name: opts.name } : {}),
    createdAt: opts.createdAt,

    ...(opts.resumedAt ? { resumedAt: opts.resumedAt } : {}),

    todos: EMPTY_TODOS,
    status: opts.status,
    tokens: getTokens(ctx),
    lastUpdatedAt: new Date().toISOString(),
    currentModel: model?.name ?? model?.id ?? "unknown",
  };
}
