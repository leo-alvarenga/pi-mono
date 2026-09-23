import {
  CustomEditor,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

import type { SpinnerPhase } from "../../config/types";
import type { ExternalData, FrameData } from "../../components/types";
import type {
  EditorFrameRenderer,
  EditorFrameRenderOptions,
} from "../../renderers/types";

import {
  handlePaletteInput,
  loadPaletteItems,
  renderPalette,
  type PaletteState,
} from "../palette";
import { SpinnerController } from "../spinner";
import { renderLinearFrame } from "./render";

export class LinearEditor extends CustomEditor implements EditorFrameRenderer {
  private pi: ExtensionAPI;
  private opts: EditorFrameRenderOptions;
  private spinner = new SpinnerController();
  private paletteState: PaletteState | null = null;
  private provider: (pi: ExtensionAPI) => ExternalData;

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

  refresh(): void {
    this.tui.requestRender();
  }

  openPalette(): void {
    const all = loadPaletteItems(this.pi);
    this.paletteState = { query: "", all, items: all, selected: 0, viewTop: 0 };
    this.tui.requestRender();
  }

  setSpinner(phase: SpinnerPhase | null): void {
    if (phase) {
      this.spinner.start(phase, () => this.tui.requestRender());
    } else {
      this.spinner.stop();
    }
  }

  stopSpinner(): void {
    this.spinner.stop();
    this.tui.requestRender();
  }

  override handleInput(data: string): void {
    if (!this.paletteState) {
      super.handleInput(data);
      return;
    }

    const result = handlePaletteInput(this.paletteState, data);
    if (result.submit) {
      this.paletteState = null;
      this.setText(result.submit);
      super.handleInput("\r");

      return;
    }

    this.paletteState = result.next;
    this.tui.requestRender();
  }

  override render(width: number): string[] {
    if (this.paletteState) {
      const ext = this.provider(this.pi);
      if (ext.theme) return renderPalette(this.paletteState, width, ext.theme);
    }

    const { frame } = this.opts;
    const marginX = Math.min(1, Math.max(0, Math.floor(width / 2)));
    const contentWidth = width - marginX * 2;

    if (contentWidth < (frame.minWidth ?? 20)) return super.render(width);

    const ext = this.provider(this.pi);
    if (!ext.theme || !frame.enable) return super.render(width);

    const d: FrameData = {
      cwd: ext.cwd,
      context: ext.context,
      gitDirty: ext.gitDirty,
      agentMode: ext.agentMode,
      gitBranch: ext.gitBranch,
      modelName: ext.modelName,
      spinnerPhase: ext.spinnerPhase,
      modelProvider: ext.modelProvider,
      notifyEnabled: ext.notifyEnabled,
      thinkingLevel: ext.thinkingLevel,
      spinnerFrame: this.spinner.frame(),
      accentColor: this.opts.accentColor,
    };

    return renderLinearFrame(
      (innerWidth) => super.render(innerWidth),
      this.opts,
      ext,
      d,
      width,
    );
  }
}
