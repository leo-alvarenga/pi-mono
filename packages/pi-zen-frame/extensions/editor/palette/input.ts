import { Key, matchesKey } from "@earendil-works/pi-tui";

import { filterPalette, MAX_VISIBLE } from "./items";
import type { PaletteState } from "./types";

export type PaletteInputResult = {
  submit: string | null;
  next: PaletteState | null;
};

/** Pure palette input handling. `next === null` means the palette should close;
 *  `submit !== null` means the item was confirmed and should be submitted */
export function handlePaletteInput(
  state: PaletteState,
  data: string,
): PaletteInputResult {
  if (matchesKey(data, Key.esc)) {
    return { next: null, submit: null };
  }

  const item = state.items[state.selected];
  if (data === "\r" || data === "\n") {
    return { next: null, submit: item ? item.name : null };
  }

  if (matchesKey(data, Key.tab)) {
    return {
      submit: null,
      next: { ...state, query: item.name.replace("/", "") },
    };
  }

  if (matchesKey(data, Key.backspace) || matchesKey(data, Key.delete)) {
    if (state.query.length > 0) {
      const query = state.query.slice(0, -1);

      return {
        submit: null,

        next: {
          ...state,
          query,
          viewTop: 0,
          selected: 0,
          items: filterPalette(state.all, query),
        },
      };
    }

    return { next: state, submit: null };
  }

  if (matchesKey(data, "up")) {
    const selected = Math.max(0, state.selected - 1);
    const viewTop = selected < state.viewTop ? selected : state.viewTop;

    return {
      submit: null,
      next: { ...state, selected, viewTop },
    };
  }

  if (matchesKey(data, "down")) {
    const selected = Math.min(
      Math.max(0, state.items.length - 1),
      state.selected + 1,
    );

    let viewTop = state.viewTop;
    if (selected >= viewTop + MAX_VISIBLE) {
      viewTop = selected - MAX_VISIBLE + 1;
    }

    return {
      submit: null,
      next: { ...state, selected, viewTop },
    };
  }

  if (data.length === 1 && data >= " ") {
    const query = state.query + data;

    return {
      submit: null,
      next: {
        ...state,
        query,
        viewTop: 0,
        selected: 0,
        items: filterPalette(state.all, query),
      },
    };
  }

  return { next: state, submit: null };
}
