import type { TUI } from "@earendil-works/pi-tui";
import type {
  CustomEditor,
  ExtensionAPI,
  Theme,
  ThemeColor,
} from "@earendil-works/pi-coding-agent";
import type { FrameSettings, Settings, SpinnerPhase } from "../config/types";
import type { ExternalData } from "../components/types";

import type { HeaderEnv } from "../headers";

/** What pi's TUI needs from any header implementation */
export interface HeaderRenderer {
  invalidate(): void;
  render(width: number): string[];
}

/** Builds a HeaderRenderer; matches ctx.ui.setHeader's factory signature */
export type HeaderRendererFactory = (
  tui: TUI,
  theme: Theme,
  pi: ExtensionAPI,
  settings: Settings,
  getEnv: (pi: ExtensionAPI) => HeaderEnv,
) => HeaderRenderer;

/** Per-renderer options handed to the frame factory (frame config + accent) */
export interface EditorFrameRenderOptions {
  frame: FrameSettings;
  accentColor: ThemeColor;
}

/** Surface the entry point drives on the active editor-frame renderer. */
export interface EditorFrameRenderer extends CustomEditor {
  refresh(): void;
  openPalette(): void;
  stopSpinner(): void;
  setSpinner(phase: SpinnerPhase | null): void;
}

/** Builds an EditorFrameRenderer; `...args` forward to CustomEditor. */
export type EditorFrameFactory = (
  pi: ExtensionAPI,
  provider: (pi: ExtensionAPI) => ExternalData,
  opts: EditorFrameRenderOptions,
  ...args: ConstructorParameters<typeof CustomEditor>
) => EditorFrameRenderer;
