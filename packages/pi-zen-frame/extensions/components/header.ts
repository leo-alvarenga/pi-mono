import type { TUI } from "@earendil-works/pi-tui";
import { visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import type {
  ExtensionAPI,
  Theme,
  ThemeColor,
} from "@earendil-works/pi-coding-agent";

import {
  DEFAULT_ICONS,
  DEFAULT_SETTINGS,
  HEADER_TIPS,
} from "../config/constants";
import type { Settings } from "../config/types";
import { fitFrameRow } from "./frame";
import { getShortCwd } from "../utils";

/** Below which terminal width the box is skipped (plain logo). */
const MIN_BOX_WIDTH = 20;
const LEFT_COL_RATIO = 0.4; // logo column width / total width

/** Live env snapshot the header renders in the right column. */
export interface HeaderEnv {
  gitBranch: string | undefined;
  gitDirty: number;
  cwd: string;

  /** Combined display name, e.g. `"Model (Provider)"` (provider embedded). */
  modelName: string | undefined;
}

const RANDOM_TIP =
  HEADER_TIPS[Math.floor(Math.random() * HEADER_TIPS.length)]?.text ?? "";

export function createHeader(
  _tui: TUI,
  theme: Theme,
  pi: ExtensionAPI,
  settings: Settings,
  getEnv: (pi: ExtensionAPI) => HeaderEnv,
) {
  if (!settings.header?.enable) {
    return {
      render(): string[] {
        return [];
      },

      invalidate() {},
    };
  }

  const accentColor =
    settings.header?.accentColor ?? settings.accentColor ?? "accent";

  const logo = {
    lines: settings.header?.logo ?? DEFAULT_SETTINGS.header?.logo ?? [],
    color: settings.header?.logoColor ?? DEFAULT_SETTINGS.header?.logoColor,
  };

  const leftLines = [
    ...logo.lines.map((l) => theme.fg(logo.color, l)),

    "",
    "",

    theme.bold(
      theme.fg(
        "muted",
        settings.header?.heading ?? DEFAULT_SETTINGS.header?.heading,
      ),
    ),

    "",

    theme.italic(
      theme.fg(
        "muted",
        settings.header?.subheading ?? DEFAULT_SETTINGS.header?.subheading,
      ),
    ),
  ];

  const border = (s: string, fg?: ThemeColor) => theme.fg(fg ?? accentColor, s);

  /** Space-pad `text` so it sits horizontally centered within `inner` cols. */
  function center(text: string, inner: number): string {
    const w = visibleWidth(text);
    const left = Math.max(0, Math.floor((inner - w) / 2));
    const right = Math.max(0, inner - w - left);

    return " ".repeat(left) + text + " ".repeat(right);
  }

  /** Claude-style split row: │ logo (leftW) │ info (rightW) │, exactly `width` cols. */
  function splitRow(
    leftW: number,
    rightW: number,
    left: string,
    right: string,
  ): string {
    const left2 = center(left, leftW);
    const right2 = "  " + right;
    const pad = " ".repeat(Math.max(0, rightW - visibleWidth(right2)));

    return border("│") + left2 + border("│") + right2 + pad + border("│");
  }

  /** Right column halves: top = model(+provider), bottom = cwd + git. */
  function infoRows(env: HeaderEnv): string[] {
    const icons = DEFAULT_ICONS;
    const parts: string[] = [];

    if (env.cwd) {
      parts.push(theme.fg("muted", `${icons.folder} ${getShortCwd(env.cwd)}`));
    }
    if (env.gitBranch) {
      parts.push(theme.fg(accentColor, `${icons.gitBranch} ${env.gitBranch}`));

      if (env.gitDirty > 0) {
        parts.push(theme.fg("error", `${icons.gitDirty} ${env.gitDirty}`));
      }
    }

    return [
      theme.bold(border("Model Info")),
      env.modelName ? theme.fg("muted", `${icons.model} ${env.modelName}`) : "",
      "",
      theme.bold(border("Current Directory")),
      parts.length ? parts.join(" · ") : "",
      "",
      theme.bold(border("Tip")),
      theme.fg("muted", RANDOM_TIP),
    ];
  }

  return {
    render(width: number): string[] {
      // Too narrow for a box → fall back to a plain centered logo.
      if (width < MIN_BOX_WIDTH) {
        return leftLines;
      }

      const env = getEnv(pi);
      const rightRows = infoRows(env);

      const inner = Math.max(0, width - 2);
      const leftW = Math.floor(inner * LEFT_COL_RATIO);
      const rightW = inner - leftW - 1; // divider column

      // No truncation: overflow wraps onto following lines until it all fits.
      const leftWrapped = leftLines
        .map((l) => wrapTextWithAnsi(l, leftW))
        .flat();
      const rightWrapped = rightRows
        .map((r) => wrapTextWithAnsi(r, Math.max(1, rightW - 2))) // 2-col indent
        .flat();

      const height = Math.max(leftWrapped.length, rightWrapped.length);
      const logoTop = Math.max(
        0,
        Math.floor((height - leftWrapped.length) / 2),
      );
      const rightTop = Math.max(
        0,
        Math.floor((height - rightWrapped.length) / 2),
      );

      const lines: string[] = [""];

      lines.push(fitFrameRow("╭", "╮", "", "", width, border));
      lines.push(splitRow(leftW, rightW, "", ""));

      for (let i = 0; i < height; i++) {
        const l = i - logoTop;
        const leftLine =
          l >= 0 && l < leftWrapped.length ? leftWrapped[l]! : "";

        const r = i - rightTop;
        const rightLine =
          r >= 0 && r < rightWrapped.length ? rightWrapped[r]! : "";

        lines.push(splitRow(leftW, rightW, leftLine, rightLine));
      }

      lines.push(splitRow(leftW, rightW, "", ""));
      lines.push(fitFrameRow("╰", "╯", "", "", width, border));

      return lines;
    },
    invalidate() {},
  };
}
