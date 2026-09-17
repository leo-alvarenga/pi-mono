import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { KeyId } from "@earendil-works/pi-tui";

import type { SessionRecordStore } from "../session/types";

/** PanelWidget UI specs **/
export type PanelWidgetSpec<T> = {
  maxRows: number;
  widgetKey: string;
  emptyText: string;
  toggleChord: KeyId;
  isEmpty(s: T): boolean;
  store: SessionRecordStore<T>;

  /** Given an `overflow` number of lines, produce a label to be used when truncating text areas **/
  moreLabel: (overflow: number) => string;

  /** Render function to define the widget header UI **/
  header(s: T, theme: Theme, isCollapsed: boolean): string;

  /** Render function for rows **/
  rows(
    s: T,
    theme: Theme,
    opts: { isCollapsed: boolean; maxRows: number },
  ): string[];
};

/** Callback controls over the result PanelWidget **/
export type PanelWidgetControls = {
  register(): void;
  refresh(ctx: ExtensionContext): void;
};
