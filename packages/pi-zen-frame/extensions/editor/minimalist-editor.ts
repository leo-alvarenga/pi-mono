import {
  CustomEditor,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

import type { SpinnerPhase } from "../config/types";
import type { ExternalData } from "../components/types";
import type {
  EditorFrameRenderer,
  EditorFrameRenderOptions,
} from "../renderers/types";

import {
  handlePaletteInput,
  loadPaletteItems,
  renderPalette,
  type PaletteState,
} from "./palette";

export class MinimalistEditor
  extends CustomEditor
  implements EditorFrameRenderer
{
  private pi: ExtensionAPI;
  private provider: (pi: ExtensionAPI) => ExternalData;
  private paletteState: PaletteState | null = null;

  constructor(
    pi: ExtensionAPI,
    provider: (pi: ExtensionAPI) => ExternalData,
    _: EditorFrameRenderOptions,
    ...args: ConstructorParameters<typeof CustomEditor>
  ) {
    super(...args);
    this.pi = pi;
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

  stopSpinner(): void {}
  setSpinner(_phase: SpinnerPhase | null): void {}

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

      if (ext.theme) {
        return renderPalette(this.paletteState, width, ext.theme);
      }
    }

    const boxW = Math.min(68, Math.max(36, width - 4));

    const inner = boxW - 2;
    const lPad = " ".repeat(Math.max(0, Math.floor((width - boxW) / 2)));

    const b = (s: string) => this.borderColor(s);

    const line = super.render(inner)[1] ?? "";
    const title = "─ MinimalistEditor ";

    return [
      lPad +
        b("╭" + title + "─".repeat(Math.max(0, inner - title.length)) + "╮"),
      lPad + b("│") + line + b("│"),
      lPad + b("╰" + "─".repeat(inner) + "╯"),
    ];
  }
}
