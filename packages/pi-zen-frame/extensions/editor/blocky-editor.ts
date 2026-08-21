/**
 * BlockyEditor — the editor-frame renderer. Subclasses CustomEditor so all of
 * pi's editing/undo/app-keybinding machinery keeps working; `render` layers
 * the bg band. Vim behavior was removed — all input passes through to the
 * base editor. Appearance lives in `components/` (segments + frame).
 */
import {
  CustomEditor,
  ThemeColor,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

import { DEFAULT_ICONS, SPINNER_FRAMES } from "../config/constants";
import type { SpinnerPhase } from "../config/types";
import { composeBand, fitInfoRow, isBorderRow } from "../components/frame";
import { segmentsFor } from "../components/registry";
import type {
  ExternalData,
  FrameData,
  SegmentContext,
} from "../components/types";
import type { EditorFrameRenderOptions } from "../renderers/types";

export class BlockyEditor extends CustomEditor {
  private pi: ExtensionAPI;
  private opts: EditorFrameRenderOptions;
  private provider: (pi: ExtensionAPI) => ExternalData;

  private spinnerIdx = 0;
  private spinnerPhase: SpinnerPhase | null = null;
  private spinnerTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    pi: ExtensionAPI,
    provider: (pi: ExtensionAPI) => ExternalData,
    opts: EditorFrameRenderOptions,
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

    const padX = Math.min(2, Math.max(0, Math.floor(width / 2)));

    const marginX = Math.min(1, Math.max(0, Math.floor(width / 2)));

    const contentWidth = width - marginX * 2;
    const innerWidth = width - padX * 2 - marginX * 2;
    if (innerWidth < 8) return super.render(width);

    const ext = this.provider(this.pi);
    const d: FrameData = {
      cwd: ext.cwd,
      context: ext.context,
      zenMode: ext.zenMode,
      gitDirty: ext.gitDirty,
      agentMode: ext.agentMode,
      gitBranch: ext.gitBranch,
      modelName: ext.modelName,
      spinnerPhase: ext.spinnerPhase,
      modelProvider: ext.modelProvider,
      thinkingLevel: ext.thinkingLevel,
      spinnerFrame: this.spinnerFrame(),
      accentColor: this.opts.accentColor,
    };

    let prefix = "┃";

    if (ext.theme?.fg) {
      const prefixColor: ThemeColor =
        ext.agentMode?.color ?? this.opts.accentColor ?? "text";
      prefix = ext.theme.fg(prefixColor, prefix);
    }

    // No theme (non-TUI) or frame disabled or too narrow → plain editor.
    if (!ext.theme || !frame.enable || contentWidth < (frame.minWidth ?? 20)) {
      return super.render(width);
    }

    const inner = super.render(innerWidth);

    let bottomIdx = inner.length - 1;
    for (let i = inner.length - 1; i >= 0; i--) {
      if (isBorderRow(inner[i]!)) {
        bottomIdx = i;
        break;
      }
    }

    const content = inner.slice(1, bottomIdx);
    const autocomplete = inner.slice(bottomIdx + 1);

    const bgSgr = ext.theme.getBgAnsi("customMessageBg");
    const paint = (row: string) =>
      bgSgr + row.split("\x1b[0m").join(`\x1b[0m${bgSgr}`) + "\x1b[0m";

    const ctx: SegmentContext = {
      cfg: frame,
      theme: ext.theme,
      icons: DEFAULT_ICONS,
    };

    const box = composeBand(content, autocomplete, {
      padX,
      paint,
      prefix,
      width: contentWidth,
      marginX: 1,
      paddingTop: 1,
      paddingBottom: 1,
      boxBottom: fitInfoRow(
        segmentsFor("topLeft", d, ctx),
        segmentsFor("topRight", d, ctx),
        innerWidth,
      ),
    });

    const pseudoFooter = fitInfoRow(
      segmentsFor("bottomLeft", d, ctx),
      segmentsFor("bottomRight", d, ctx),
      contentWidth,
    );

    // Blank rows OUTSIDE the band, above/below it.
    const marginRow = " ".repeat(contentWidth);
    const marginTop: string[] = [];
    const marginBottom: string[] = [];

    return [...marginTop, ...box, marginRow, pseudoFooter, ...marginBottom].map(
      (row) => " ".repeat(marginX) + row + " ".repeat(marginX),
    );
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
