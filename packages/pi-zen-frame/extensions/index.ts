/**
 * pi-zen-frame entry. Thin wiring layer:
 *   - loads config, subscribes to pi lifecycle + mode/agent-mode events
 *   - installs FrameEditor via setEditorComponent (factory is re-run on
 *     model switch — the old instance's spinner timer is stopped first)
 *   - assembles ExternalData per paint (model, thinking, context, git, ...)
 *
 * All appearance logic lives in components/ (segments + frame); the editor
 * component lives in editor/. Nothing here renders anything.
 */
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { KeyId } from "@earendil-works/pi-tui";

import {
  DEFAULT_SETTINGS,
  PI_AGENT_MANAGER_AGENT_EVENT,
  SPINNER_FRAMES,
  ZEN_MODE_DEFAULT_KEY,
  ZEN_MODE_SHORTCUT_ID,
} from "./config/constants";
import { loadSettings } from "./config/settings";
import type { Settings, SpinnerPhase } from "./config/types";
import type { AgentMode, AgentState, ExternalData } from "./components/types";
import { FrameEditor } from "./editor/frame-editor";
import {
  capitalize,
  readAgentModeFromSession,
  readGit,
  type GitInfo,
} from "./utils";
import { createHeader, type HeaderEnv } from "./components/header";

let editor: FrameEditor | null = null;
let currentCtx: ExtensionContext | null = null;
let settings: Settings = DEFAULT_SETTINGS;
let spinnerPhase: SpinnerPhase | null = null;
let agentMode: AgentMode = null;
let zenMode = true;
let git: GitInfo = {
  branch: undefined,
  dirty: 0,
};
let workingMessageTimer: ReturnType<typeof setInterval> | null = null;
let workingMessageBag: string[] = [];

/** Pop a random message; reshuffles when the pool is exhausted (no back-to-back repeats). */
function nextWorkingMessage(): string {
  if (workingMessageBag.length === 0) {
    workingMessageBag = [...(settings.workingMessage?.messages ?? [])];

    for (let i = workingMessageBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [workingMessageBag[i], workingMessageBag[j]] = [
        workingMessageBag[j],
        workingMessageBag[i],
      ];
    }
  }

  return (workingMessageBag.pop() ?? "").concat("...");
}

// ── data sources ─────────────────────────────────────────────────────────
//

/** Live env snapshot for the header's right column. Reads current git/ctx so
 *  model switches are reflected on the next render. */
function getHeaderEnv(pi: ExtensionAPI): HeaderEnv {
  return {
    gitDirty: git.dirty,
    gitBranch: git.branch,
    cwd: currentCtx?.cwd ?? "",
    modelName: provideExternal(pi).modelName,
  };
}

function provideExternal(pi: ExtensionAPI): ExternalData {
  const ctx = currentCtx;
  const usage = ctx?.getContextUsage?.();
  const model = ctx?.model;

  return {
    zenMode,
    agentMode,
    spinnerPhase,
    cwd: ctx?.cwd ?? "",
    gitDirty: git.dirty,
    gitBranch: git.branch,
    theme: ctx?.ui.theme,
    thinkingLevel: pi.getThinkingLevel(),
    modelName: `${model?.name ?? model?.id ?? "Unknown"} (${capitalize(model?.provider ?? "unknown")})`,
    context: usage
      ? {
          tokens: usage.tokens,
          window: usage.contextWindow,
          percent: usage.percent,
        }
      : null,
  };
}

function setSpinner(phase: SpinnerPhase | null): void {
  if (spinnerPhase === phase) return;

  spinnerPhase = phase;
  editor?.setSpinner(phase);
}

/** Keys bound to the zen toggle in keybindings.json; default key if unset.
 *  `[]` disables the shortcut (the /zen_mode command still works). */
function zenModeKeys(): string[] {
  try {
    const raw = JSON.parse(
      readFileSync(join(getAgentDir(), "keybindings.json"), "utf8"),
    ) as Record<string, unknown>;
    const v = raw[ZEN_MODE_SHORTCUT_ID];
    if (typeof v === "string") return [v];
    if (Array.isArray(v) && v.every((k) => typeof k === "string")) return v;
  } catch {
    /* no keybindings file → default key */
  }

  return [ZEN_MODE_DEFAULT_KEY];
}

function toggleZenMode(): boolean {
  zenMode = !zenMode;
  editor?.refresh();
  return zenMode;
}

function notifyZen(ctx: {
  ui: { notify(message: string, type?: "info" | "warning" | "error"): void };
}): void {
  ctx.ui.notify(toggleZenMode() ? "Zen mode: on" : "Zen mode: off", "info");
}

// ── extension entry ──────────────────────────────────────────────────────

export default async function (pi: ExtensionAPI) {
  settings = await loadSettings();
  zenMode = settings.zenMode !== false;

  pi.registerCommand("zen_mode", {
    description:
      "Toggle Editor Zen mode (all segments muted except agent mode)",
    handler: async (_, ctx) => notifyZen(ctx),
  });

  for (const key of zenModeKeys()) {
    pi.registerShortcut(key as KeyId, {
      description: "Toggle Zen mode",
      handler: (ctx) => notifyZen(ctx),
    });
  }

  // Optional pi-agent-manager integration (no hard dependency).
  pi.events.on(PI_AGENT_MANAGER_AGENT_EVENT, (event) => {
    const state = event as AgentState | undefined;

    if (state?.currentAgentConfig?.name) {
      agentMode = {
        icon: state.currentAgentConfig.icon,
        color: state.currentAgentConfig.color,
        name: state.currentAgentLabel || state.currentAgentConfig.name,
      };
    } else if (state) {
      agentMode = { name: state.currentAgentLabel || state.currentAgent };
    }

    editor?.refresh();
  });

  pi.on("session_start", async (_event, ctx) => {
    currentCtx = ctx;
    agentMode = readAgentModeFromSession(ctx) || agentMode;

    git = readGit(ctx.cwd);

    ctx.ui.setWorkingIndicator({
      intervalMs: 80,
      frames: SPINNER_FRAMES.outputting,
    });

    // Rotating messages in the built-in working loader while streaming.
    const wm = settings.workingMessage;
    if (wm && wm.enable !== false && (wm.messages?.length ?? 0) > 0) {
      const intervalMs = Math.max(100, wm.intervalMs ?? 3000);

      ctx.ui.setWorkingMessage(nextWorkingMessage());

      workingMessageTimer = setInterval(() => {
        ctx.ui.setWorkingMessage(nextWorkingMessage());
      }, intervalMs);
    }

    if (settings.header?.enable) {
      ctx.ui.setHeader((_tui, theme) =>
        createHeader(_tui, theme, pi, settings, getHeaderEnv),
      );
    }

    ctx.ui.setFooter(() => ({
      render() {
        return [];
      },

      invalidate() {},
    }));

    ctx.ui.setEditorComponent((...args) => {
      editor?.stopSpinner();

      editor = new FrameEditor(
        pi,
        provideExternal,
        {
          frame: settings.frame ?? DEFAULT_SETTINGS.frame!,
          accentColor:
            settings.accentColor ?? DEFAULT_SETTINGS.accentColor ?? "accent",
        },
        ...args,
      );

      return editor;
    });
  });

  pi.on("session_shutdown", () => {
    if (workingMessageTimer) clearInterval(workingMessageTimer);
    workingMessageTimer = null;
    workingMessageBag = [];

    editor?.stopSpinner();
    editor = null;
    currentCtx = null;
    spinnerPhase = null;
  });

  // Spinner phases
  pi.on("agent_end", () => setSpinner(null));
  pi.on("turn_start", () => setSpinner("thinking"));
  pi.on("tool_execution_start", () => setSpinner("exec"));

  pi.on("message_update", (event) => {
    const type = event?.assistantMessageEvent?.type;

    if (typeof type !== "string") return;

    if (type.startsWith("text_")) setSpinner("outputting");
    else if (type.startsWith("thinking_")) setSpinner("thinking");
    else if (type.startsWith("toolcall_")) setSpinner("toolcall");
    else setSpinner("idle");
  });
}
