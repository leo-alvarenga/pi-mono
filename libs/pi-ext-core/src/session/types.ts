import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export type SessionBranchEntry = {
  type: string;
  customType?: string;
  data?: unknown;
};

export type SessionRecordStore<T> = {
  getState(ctx: ExtensionContext): T;
  replay(ctx: ExtensionContext): void;
  commit(ctx: ExtensionContext, next: T): void;
  persistSnapshot(ctx: ExtensionContext): void;
};
