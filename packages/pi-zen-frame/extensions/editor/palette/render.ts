import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";

import { MAX_VISIBLE } from "./items";
import type { PaletteState } from "./types";

const ACTIVE_PREFIX = " ▶ ";
const INACTIVE_PREFIX = "   ";

export function renderPalette(
  state: PaletteState,
  width: number,
  theme: Theme,
): string[] {
  const boxW = Math.min(68, Math.max(36, width - 4));

  const inner = boxW - 2;
  const lPad = " ".repeat(Math.max(0, Math.floor((width - boxW) / 2)));

  const d = (s: string) => theme.fg("dim", s);
  const b = (s: string) => theme.fg("accent", s);
  const bRow = (content: string) => lPad + b("│") + content + b("│");

  const getLPadStr = (labelW: number, content: string) =>
    " ".repeat(Math.max(0, labelW - visibleWidth(content)));

  const padTo = (text: string, w: number) =>
    text + " ".repeat(Math.max(0, w - visibleWidth(text)));

  const title = "─ Command Palette ";

  const rows: string[] = [
    lPad + b("╭" + title + "─".repeat(Math.max(0, inner - title.length)) + "╮"),
    bRow(padTo(" /" + state.query, inner)),
    lPad + b("├" + "─".repeat(inner) + "┤"),
  ];

  const visible = state.items.slice(state.viewTop, state.viewTop + MAX_VISIBLE);

  if (visible.length === 0) {
    const nm = "  no matches";
    rows.push(bRow(d(nm) + " ".repeat(Math.max(0, inner - nm.length))));
  } else {
    const kindW = 5;
    const labelW = inner - 3 - 2 - kindW;

    for (let i = 0; i < visible.length; i++) {
      const item = visible[i]!;
      const sel = i === state.selected - state.viewTop;

      const label = truncateToWidth(item.name, labelW);

      const lPadStr = getLPadStr(labelW, label);

      const kind = item.name.startsWith("/skill:") ? "skill" : "cmd  ";

      const plain =
        (sel ? ACTIVE_PREFIX : INACTIVE_PREFIX) + label + lPadStr + "  " + kind;

      rows.push(bRow(sel ? b(plain) : plain.slice(0, -kindW) + d(kind)));

      if (sel) {
        const content = truncateToWidth(
          `${INACTIVE_PREFIX} ${item.description}`,
          labelW,
        );

        const lPadStr = getLPadStr(inner, content);
        rows.push(bRow(d(content) + lPadStr));
      }
    }
  }

  rows.push(lPad + b("╰" + "─".repeat(inner) + "╯"));
  rows.push(
    " ".repeat(Math.max(0, Math.floor((width - 40) / 2))) +
      d("↑↓ navigate · enter confirm · esc close"),
  );

  return rows;
}
