import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { randomBytes } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { KeyId } from "@earendil-works/pi-tui";

import type { FeatureConfig } from "../../lib/config";
import { resolveEditorCommand, spawnEditor } from "../../lib/editor";
import {
  getBoundKeys,
  unbindAction,
  type UnbindResult,
} from "../../lib/keybindings";
import { normalizeKeyId } from "../../lib/keys";
import type { QolFeature } from "../../lib/types";

type Deps = {
  unbindAction: (actionIds: string[]) => UnbindResult;
  getBoundKeys: (actionIds: string[]) => (string[] | undefined)[];
};

type PromptFile = { path: string; inCwd: boolean };

const DEFAULT_KEY = "ctrl+shift+e";

// app.editor.external is in RESERVED_KEYBINDINGS_FOR_EXTENSION_CONFLICTS with default ctrl+g
const BUILTIN_ACTIONS = ["app.editor.external", "tui.altScreen.searchNext"];
const BUILTIN_EDITOR_KEY = "ctrl+g";

let running = false;
let file: PromptFile | null = null;

/**
 * Resolve which key to register (or null to skip) based on the user's config.
 * Exported for testing with injected deps.
 */
export function resolveKeyBinding(
  options: FeatureConfig,
  notices: string[],
  deps: Deps = { getBoundKeys, unbindAction },
): string | null {
  const raw = options["keybinding"];

  if (Array.isArray(raw)) return null;
  if (raw === undefined) return DEFAULT_KEY;

  if (typeof raw !== "string") {
    notices.push(
      `invalid keybinding value (expected string), using ${DEFAULT_KEY}`,
    );

    return DEFAULT_KEY;
  }

  if (raw === "native") {
    const bound = deps.getBoundKeys(BUILTIN_ACTIONS);

    // undefined = no entry in keybindings.json = pi default (ctrl+g) is active
    const ctrlGBound =
      bound === undefined ||
      BUILTIN_ACTIONS.find((action) => bound.find((b) => b?.includes(action)));

    if (!ctrlGBound) return BUILTIN_EDITOR_KEY;
    const result = deps.unbindAction(BUILTIN_ACTIONS);

    if (!result.ok) {
      notices.push(result.reason);

      return DEFAULT_KEY;
    }

    notices.push(
      `unbound pi's built-in editor key; run \`/reload\` to activate \`${BUILTIN_EDITOR_KEY}\``,
    );

    return BUILTIN_EDITOR_KEY;
  }

  const canonical = normalizeKeyId(raw);
  if (!canonical) {
    notices.push(`invalid keybinding "${raw}", using ${DEFAULT_KEY}`);

    return DEFAULT_KEY;
  }

  if (canonical === BUILTIN_EDITOR_KEY) {
    notices.push(
      `\`${BUILTIN_EDITOR_KEY}\` is reserved by pi's built-in editor; set \`keybinding: "native"\` to take it over`,
    );

    return DEFAULT_KEY;
  }

  return canonical;
}

function createPromptFile(cwd: string, text: string): PromptFile {
  const newId = () => randomBytes(6).toString("base64url");

  for (let i = 0; i < 2; i++) {
    const filePath = join(cwd, `prompt-${newId()}.md`);

    try {
      writeFileSync(filePath, text, { flag: "wx", encoding: "utf8" });

      return { path: filePath, inCwd: true };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;

      if (code === "EEXIST") continue;
      if (code === "EACCES" || code === "EROFS" || code === "EPERM") break;

      throw err;
    }
  }

  const filePath = join(tmpdir(), `prompt-${newId()}.md`);
  writeFileSync(filePath, text, "utf8");

  return { path: filePath, inCwd: false };
}

function rmPromptFile(file: PromptFile): void {
  try {
    rmSync(file.path, { force: true });
  } catch {
    // ignore
  }
}

async function openEditor(ctx: ExtensionContext): Promise<void> {
  if (ctx.mode !== "tui" || !ctx.hasUI) {
    ctx.ui.notify(
      "pi-qol: external editor needs the interactive TUI",
      "warning",
    );

    return;
  }

  if (running) return;
  running = true;

  try {
    if (file) rmPromptFile(file);

    file = createPromptFile(ctx.cwd, ctx.ui.getEditorText());

    if (!file.inCwd) {
      ctx.ui.notify(
        `pi-qol: cwd not writable, using temp file: ${file.path}`,
        "warning",
      );
    }

    const command = resolveEditorCommand();

    let exit: number | null = null;
    await ctx.ui.custom<null>(async (tui, _theme, _kb, done) => {
      if (file) {
        tui.stop();
        try {
          exit = await spawnEditor(command, file.path);
        } finally {
          tui.start();
          tui.requestRender(true);
        }
      }

      done(null);
      return { render: () => [], invalidate() {} };
    });

    if (exit === 0) {
      ctx.ui.setEditorText(readFileSync(file.path, "utf8"));

      rmPromptFile(file);
    } else {
      ctx.ui.notify(
        exit === null
          ? `pi-qol: could not launch "${command}". Prompt kept at ${file.path}`
          : `pi-qol: editor exited with code ${exit}. Prompt kept at ${file.path}`,
        "warning",
      );
    }
  } finally {
    running = false;
  }
}

function register(pi: ExtensionAPI, options: FeatureConfig): void {
  const notices: string[] = [];
  const key = resolveKeyBinding(options, notices);

  if (key) {
    pi.registerShortcut(key as KeyId, {
      handler: openEditor,
      description: "Edit prompt in external editor (cwd file)",
    });
  }

  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;

    for (const notice of notices.splice(0)) {
      ctx.ui.notify(`pi-qol: ${notice}`, "warning");
    }
  });

  pi.on("session_shutdown", () => {
    if (file) rmPromptFile(file);
  });
}

const feature: QolFeature = {
  register,
  name: "external-editor-cwd",
};

export default feature;
