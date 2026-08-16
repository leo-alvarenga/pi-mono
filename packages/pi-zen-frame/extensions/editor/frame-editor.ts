/**
 * FrameEditor — the editor component. Subclasses CustomEditor so all of
 * pi's editing/undo/app-keybinding machinery keeps working; `render` layers
 * the box frame. Vim behavior was removed — all input passes through to the
 * base editor. Appearance lives in `components/` (segments + frame).
 */
import {
  CustomEditor,
  ThemeColor,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

import { DEFAULT_ICONS, SPINNER_FRAMES } from "../config/constants";
import type { FrameSettings, SpinnerPhase } from "../config/types";
import { renderFrame, fitInfoRow } from "../components/frame";
import { segmentsFor } from "../components/registry";
import type {
  ExternalData,
  FrameData,
  SegmentContext,
} from "../components/types";
import { isThemeColor } from "../utils";

export interface FrameEditorOptions {
  frame: FrameSettings;
  accentColor: ThemeColor;
}

export class FrameEditor extends CustomEditor {
  private pi: ExtensionAPI;
  private opts: FrameEditorOptions;
  private provider: (pi: ExtensionAPI) => ExternalData;

  private spinnerIdx = 0;
  private spinnerPhase: SpinnerPhase | null = null;
  private spinnerTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    pi: ExtensionAPI,
    provider: (pi: ExtensionAPI) => ExternalData,
    opts: FrameEditorOptions,
    ...args: ConstructorParameters<typeof CustomEditor>
  ) {
    super(...args);

    this.pi = pi;
    this.opts = opts;
    this.provider = provider;
  }

  setSpinner(phase: SpinnerPhase | null): void {
    if (this.spinnerPhase === phase) return;

    this.spinnerIdx = 0;
    this.spinnerPhase = phase;
    this.clearSpinnerTimer();

    if (phase && SPINNER_FRAMES[phase]) {
      const frames = SPINNER_FRAMES[phase];

      this.spinnerTimer = setInterval(() => {
        this.spinnerIdx = (this.spinnerIdx + 1) % frames.length;
        this.tui.requestRender();
      }, 80);
    }

    this.tui.requestRender();
  }

  stopSpinner(): void {
    this.clearSpinnerTimer();
    this.spinnerPhase = null;
  }

  refresh(): void {
    this.tui.requestRender();
  }

  // ── rendering ──────────────────────────────────────────────────────────

  render(width: number): string[] {
    const frame = this.opts.frame;

    const padX = Math.min(
      frame.paddingX ?? 1,
      Math.max(0, Math.floor((width - 2) / 2)),
    );

    const innerWidth = width - 2 - padX * 2;
    if (innerWidth < 8) return super.render(width);

    const ext = this.provider(this.pi);
    const d: FrameData = {
      cwd: ext.cwd,
      context: ext.context,
      gitDirty: ext.gitDirty,
      agentMode: ext.agentMode,
      gitBranch: ext.gitBranch,
      modelName: ext.modelName,
      spinnerPhase: ext.spinnerPhase,
      thinkingLevel: ext.thinkingLevel,
      spinnerFrame: this.spinnerFrame(),
      accentColor: this.opts.accentColor,
      zenMode: ext.zenMode,
    };

    let prefix = frame.prefix ?? "❯";

    if (ext.theme?.fg) {
      let borderColor: ThemeColor = "accent";

      if (frame.borderColor === "agentMode") {
        borderColor = ext.agentMode?.color ?? "accent";
      } else {
        borderColor = frame.borderColor ?? "accent";
      }

      let prefixColor: ThemeColor = "text";
      if (frame.prefixColor === "agentMode") {
        prefixColor = ext.agentMode?.color ?? "accent";
      } else if (frame.prefixColor === "frameBorder") {
        prefixColor = borderColor;
      } else if (frame.prefixColor && isThemeColor(frame.prefixColor)) {
        prefixColor = frame.prefixColor;
      }

      prefix = ext.theme.fg(prefixColor, prefix);

      this.borderColor = (s: string) => ext.theme!.fg(borderColor, s);
    }

    // No theme (non-TUI) or frame disabled or too narrow → plain editor.
    if (!ext.theme || !frame.enable || width < (frame.minWidth ?? 20)) {
      return super.render(width);
    }

    const inner = super.render(innerWidth);
    const ctx: SegmentContext = {
      cfg: frame,
      theme: ext.theme,
      border: this.borderColor,
      icons: {
        ...DEFAULT_ICONS,
        ...frame.icons,
      },
      segColor: (key, fallback) =>
        d.zenMode && key !== "agentMode"
          ? "muted"
          : (frame.colors?.[key] ?? fallback),
    };

    const topLine = fitInfoRow(
      segmentsFor("topLeft", d, ctx),
      segmentsFor("topRight", d, ctx),
      width,
    );

    const bottomLine = fitInfoRow(
      segmentsFor("bottomLeft", d, ctx),
      segmentsFor("bottomRight", d, ctx),
      width,
    );

    const box = renderFrame(inner, {
      width,
      prefix,
      paddingX: padX,
      border: this.borderColor,
      paddingTop: frame.paddingTop ?? 1,
      paddingBottom: frame.paddingBottom ?? 1,
    });

    // Blank rows OUTSIDE the box, above/below its borders.
    const marginRow = " ".repeat(width);
    const marginTop = Array(Math.max(0, frame.marginTop ?? 0)).fill(marginRow);
    const marginBottom = Array(Math.max(0, frame.marginBottom ?? 0)).fill(
      marginRow,
    );

    return [...marginTop, topLine, ...box, bottomLine, ...marginBottom];
  }

  private spinnerFrame(): string {
    if (!this.spinnerPhase) return "";

    const frames = SPINNER_FRAMES[this.spinnerPhase]!;

    return frames[this.spinnerIdx % frames.length]!;
  }

  private clearSpinnerTimer(): void {
    if (this.spinnerTimer) {
      clearInterval(this.spinnerTimer);
      this.spinnerTimer = null;
    }
  }
}
