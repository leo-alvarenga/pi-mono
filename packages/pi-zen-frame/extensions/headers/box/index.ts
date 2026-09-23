import type { TUI } from "@earendil-works/pi-tui";
import type {
  ExtensionAPI,
  Theme,
  ThemeColor,
} from "@earendil-works/pi-coding-agent";

import {
  DEFAULT_ICONS,
  HEADER_TIPS,
  LOGO_COLOR,
  LOGO_LINES,
} from "../../config/constants";
import type { Settings } from "../../config/types";
import { fitFrameRow } from "../../components/frame";
import { getShortCwd, splitRow, wrapLines } from "../../utils";

/** Below which terminal width the box is skipped (plain logo) */
const MIN_BOX_WIDTH = 20;
const LEFT_COL_RATIO = 0.4; // logo column width / total width

const HEADING = "Welcome back!";
const SUBHEADING =
  "Ready for your next session? Terminal warm, context clean, tools ready to execute";

/** Live env snapshot the header renders in the right column */
export interface HeaderEnv {
  cwd: string;
  gitDirty: number;
  gitBranch: string | undefined;

  /** Combined display name, e.g. `"Model (Provider)"` (provider embedded) */
  modelName: string | undefined;
}

const RANDOM_TIP =
  HEADER_TIPS[Math.floor(Math.random() * HEADER_TIPS.length)]?.text ?? "";

export function createBoxHeader(
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

  const accentColor = settings.accentColor ?? "accent";

  const logo = {
    color: LOGO_COLOR,
    lines: LOGO_LINES,
  };

  const border = (s: string, fg?: ThemeColor) => theme.fg(fg ?? accentColor, s);

  /** Right column halves: top = model(+provider), bottom = cwd + git */
  function infoRows(env: HeaderEnv, width: number): string[] {
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

      ...wrapLines(
        [
          env.modelName
            ? theme.fg("muted", `${icons.model} ${env.modelName}`)
            : "",
        ],
        width,
        (str) => theme.fg("muted", str),
      ),

      "",

      theme.bold(border("Current Directory")),
      parts.length ? parts.join(" · ") : "",

      "",

      theme.bold(border("Tip")),
      ...wrapLines([RANDOM_TIP], width, (str) => theme.fg("muted", str)),
    ];
  }

  return {
    invalidate() {},

    render(width: number): string[] {
      const env = getEnv(pi);

      const inner = Math.max(0, width - 2);
      const leftW = Math.floor(inner * LEFT_COL_RATIO);

      const rightW = inner - leftW - 1;

      const rightLines = infoRows(env, rightW - 2);
      const leftLines = [
        ...logo.lines.map((l) => theme.fg(logo.color, l)),

        "",
        "",

        ...wrapLines([HEADING], leftW - 2).map((line) =>
          theme.bold(theme.fg("muted", line)),
        ),

        "",

        ...wrapLines([SUBHEADING], leftW - 2).map((line) =>
          theme.italic(theme.fg("muted", line)),
        ),
      ];

      // Too narrow for a box → fall back to a plain centered logo
      if (width < MIN_BOX_WIDTH) {
        return leftLines;
      }

      // No truncation: overflow wraps onto following lines until it all fits
      const height = Math.max(leftLines.length, rightLines.length);
      const logoTop = Math.max(0, Math.floor((height - leftLines.length) / 2));

      const rightTop = Math.max(
        0,
        Math.floor((height - rightLines.length) / 2),
      );

      const lines: string[] = [""];

      lines.push(fitFrameRow("╭", "╮", "", "", width, border));
      lines.push(splitRow(leftW, rightW, "", "", border));

      for (let i = 0; i < height; i++) {
        const l = i - logoTop;
        const leftLine = l >= 0 && l < leftLines.length ? leftLines[l]! : "";

        const r = i - rightTop;
        const rightLine = r >= 0 && r < rightLines.length ? rightLines[r]! : "";

        lines.push(splitRow(leftW, rightW, leftLine, rightLine, border));
      }

      lines.push(splitRow(leftW, rightW, "", "", border));
      lines.push(fitFrameRow("╰", "╯", "", "", width, border));

      return lines;
    },
  };
}
