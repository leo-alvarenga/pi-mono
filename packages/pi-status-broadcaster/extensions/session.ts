import { execSync } from "child_process";

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import type {
  SessionEntry,
  SessionStatus,
  TodoReport,
  TokenReport,
  TmuxInfo,
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

function getTmuxInfo(): TmuxInfo | undefined {
  const pane = process.env.TMUX_PANE;
  if (!pane) return undefined;

  try {
    const out = execSync(
      `tmux display-message -p -t ${pane} '#{session_name}|#{window_index}|#{window_name}|#{pane_index}'`,
      { encoding: "utf8" },
    ).trim();

    const [session, window, windowName, paneIdx] = out.split("|");
    return { session, window, windowName, pane: paneIdx };
  } catch {
    return undefined;
  }
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
  const tmux = getTmuxInfo();

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
    ...(tmux ? { tmux } : {}),
  };
}
