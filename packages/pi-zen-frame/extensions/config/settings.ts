import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getAgentDir } from "@earendil-works/pi-coding-agent";

import {
  CONFIG_FILE_NAME,
  DEFAULT_SETTINGS,
  WORKING_MESSAGES,
} from "./constants";
import type { Settings } from "./types";
import { isThemeColor } from "../utils";

function getResolvedSettingsFilePath(): string {
  return join(getAgentDir(), CONFIG_FILE_NAME);
}

function loadSettingsFile(): Promise<string> {
  return readFile(getResolvedSettingsFilePath(), "utf8");
}

/** Validate a raw (possibly malformed) config against the schema shapes. */
function normalize(raw: unknown): Settings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;

  const num = (v: unknown, fallback: number): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0
      ? Math.floor(v)
      : fallback;

  const bool = (v: unknown, fallback: boolean | undefined): boolean =>
    typeof v === "boolean" ? v : (fallback ?? true);

  const str = (v: unknown, fallback: string): string =>
    typeof v === "string" ? v : fallback;

  const d = DEFAULT_SETTINGS;
  const r = raw as Record<string, unknown>;

  const out: Settings = {
    ...DEFAULT_SETTINGS,
    frame: { ...DEFAULT_SETTINGS.frame },
    zenMode: bool(r.zenMode, d.zenMode ?? true),
  };

  if (typeof r.frame === "object" && r.frame) {
    const f = r.frame as Record<string, unknown>;

    out.frame = {
      enable: bool(f.enable, d.frame?.enable),
      marginX: num(f.marginX, d.frame?.marginX ?? 1),
      paddingX: num(f.paddingX, d.frame?.paddingX ?? 1),
      minWidth: num(f.minWidth, d.frame?.minWidth ?? 20),
      paddingTop: num(f.paddingTop, d.frame?.paddingTop ?? 0),
      paddingBottom: num(f.paddingBottom, d.frame?.paddingBottom ?? 1),
      marginTop: num(f.marginTop, d.frame?.marginTop ?? 0),
      marginBottom: num(f.marginBottom, d.frame?.marginBottom ?? 0),
      showModel: bool(f.showModel, d.frame?.showModel),
      showThinking: bool(f.showThinking, d.frame?.showThinking),
      showContext: bool(f.showContext, d.frame?.showContext),
      showCwd: bool(f.showCwd, d.frame?.showCwd),
      showAgentMode: bool(f.showAgentMode, d.frame?.showAgentMode),
      showSpinner: bool(f.showSpinner, d.frame?.showSpinner),
      icons:
        typeof f.icons === "object" && f.icons
          ? { ...d.frame?.icons, ...(f.icons as Record<string, unknown>) }
          : d.frame?.icons,
      prefix:
        typeof f.prefix === "string" ? f.prefix : (d.frame?.prefix ?? "┃"),

      prefixColor:
        typeof f.prefixColor === "string" &&
        (f.prefixColor === "agentMode" || isThemeColor(f.prefixColor))
          ? f.prefixColor
          : d.frame?.prefixColor, // unset → text
    };
  }

  if (typeof r.header === "object" && r.header) {
    const h = r.header as Record<string, unknown>;

    out.header = {
      enable: bool(h.enable, d.header?.enable),
      heading: str(h.heading, d.header?.heading ?? ""),
      subheading: str(h.subheading, d.header?.subheading ?? ""),
      logoColor:
        typeof h.logoColor === "string" && isThemeColor(h.logoColor)
          ? h.logoColor
          : (d.header?.logoColor ?? "accent"),
      accentColor:
        typeof h.accentColor === "string" && isThemeColor(h.accentColor)
          ? h.accentColor
          : (d.header?.accentColor ?? "accent"),
      logo:
        Array.isArray(h.logo) && h.logo.every((x) => typeof x === "string")
          ? (h.logo as string[])
          : (d.header?.logo ?? []),
    };
  }

  if (typeof r.accentColor === "string" && isThemeColor(r.accentColor)) {
    out.accentColor = r.accentColor || d.accentColor;
  }

  if (typeof r.workingMessage === "object" && r.workingMessage) {
    const wm = r.workingMessage as Record<string, unknown>;

    out.workingMessage = {
      enable:
        typeof wm.enable === "boolean"
          ? wm.enable
          : (d.workingMessage?.enable ?? true),
      intervalMs: num(wm.intervalMs, d.workingMessage?.intervalMs ?? 3000),
      messages:
        Array.isArray(wm.messages) &&
        wm.messages.length > 0 &&
        wm.messages.every((m) => typeof m === "string")
          ? (wm.messages as string[])
          : (d.workingMessage?.messages ??
            (wm?.enable === true ? WORKING_MESSAGES : [])),
    };
  }

  return out;
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = JSON.parse(await loadSettingsFile()) as unknown;
    return normalize(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
}
