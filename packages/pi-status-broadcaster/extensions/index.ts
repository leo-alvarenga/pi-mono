import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import { generateName } from "./names";
import { buildEntry } from "./session";
import { ensureFile, readReport, writeReport } from "./store";
import type { FinishedEntry, SessionEntry, SessionStatus } from "./types";

let cached = "";
let sessionId: string | null = null;
let sessionName: string | undefined = undefined;
let createdAt: string | null = null;
let resumedAt: string | undefined = undefined;
let currentCtx: ExtensionContext | null = null;

function flush(status: SessionStatus): void {
  if (!currentCtx || !sessionId || !createdAt) return;

  try {
    const entry = buildEntry(currentCtx, {
      status,
      createdAt,
      resumedAt,
      id: sessionId,
      name: sessionName,
    });

    const next = JSON.stringify(entry);
    if (next === cached) return;

    cached = next;
    const report = readReport();
    report[sessionId] = entry;

    writeReport(report);
  } catch {
    //
  }
}

export default async function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    currentCtx = ctx;

    const now = new Date().toISOString();
    const sid = ctx.sessionManager.getSessionId();

    sessionId = sid;
    ensureFile();

    const existing = readReport()[sid];

    if (!existing) {
      createdAt = now;
      resumedAt = undefined;
      sessionName = generateName();
      pi.setSessionName(sessionName);
    } else if ("finished" in existing) {
      createdAt = (existing as FinishedEntry).createdAt;
      resumedAt = now;
      sessionName = (existing as FinishedEntry).name ?? generateName();
      pi.setSessionName(sessionName);
    } else {
      createdAt = (existing as SessionEntry).createdAt;
      resumedAt = now;
      sessionName = (existing as SessionEntry).name;
    }

    flush("IDLE");
  });

  pi.on("session_info_changed", (event) => {
    if (event.name !== undefined) sessionName = event.name;
    flush("IDLE");
  });

  pi.on("agent_start", async (_event, ctx) => {
    currentCtx = ctx;
    flush("BUSY");
  });

  pi.on("agent_end", async (_event, ctx) => {
    currentCtx = ctx;
    flush("IDLE");
  });

  pi.on("session_shutdown", async () => {
    if (!sessionId || !createdAt) return;

    try {
      const finished: FinishedEntry = {
        finished: true,
        name: sessionName,
        createdAt,
        finishedAt: new Date().toISOString(),
      };

      const report = readReport();
      report[sessionId] = finished;

      writeReport(report);

      sessionId = null;
      createdAt = null;
      currentCtx = null;
      resumedAt = undefined;
      sessionName = undefined;

      cached = "";
    } catch {
      //
    }
  });

  pi.registerCommand("rename-session", {
    description: "Rename the current session",
    handler: async (args, ctx) => {
      const name = args.trim();
      if (!name) {
        ctx.ui.notify("Usage: /rename-session <new name>", "error");
        return;
      }
      pi.setSessionName(name);
    },
  });
}
