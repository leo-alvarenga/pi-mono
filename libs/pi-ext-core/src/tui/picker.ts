import type {
  ExtensionUIContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import type { SelectItem } from "@earendil-works/pi-tui";
import {
  Container,
  SelectList,
  Text,
  Key,
  matchesKey,
} from "@earendil-works/pi-tui";

export type { SelectItem };

function buildSelectContainer(
  theme: Theme,
  title: string,
  items: SelectItem[],
  maxVisible: number,
  searchInput: string,
  done: (value: string | null) => void,
): { list: SelectList; container: Container } {
  const input = searchInput.toLowerCase();
  const filtered = items.filter(
    (item) =>
      item.label.toLowerCase().includes(input) ||
      item.value.toLowerCase().includes(input),
  );

  const c = new Container();
  c.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
  c.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 1));

  if (searchInput.length > 0) {
    c.addChild(
      new Text(theme.fg("dim", `Search: ${theme.italic(searchInput)}`), 1, 1),
    );
  }

  const l = new SelectList(filtered, Math.min(filtered.length, maxVisible), {
    scrollInfo: (t) => theme.fg("dim", t),
    description: (t) => theme.fg("dim", t),
    noMatch: (t) => theme.fg("warning", t),
    selectedText: (t) => theme.fg("accent", t),
    selectedPrefix: (t) => theme.fg("accent", t),
  });

  l.onCancel = () => done(null);
  l.onSelect = (item) => done(item.value);

  c.addChild(l);
  c.addChild(
    new Text(
      theme.fg(
        "dim",
        "↑↓ navigate · enter select · esc cancel · type to filter",
      ),
      1,
      1,
    ),
  );
  c.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

  return { list: l, container: c };
}

export async function openSelectSearch(
  ui: ExtensionUIContext,
  title: string,
  items: SelectItem[],
  maxVisible = 10,
): Promise<string | null> {
  let searchInput = "";

  return ui.custom<string | null>((tui, theme, _kb, done) => {
    let { list, container } = buildSelectContainer(
      theme,
      title,
      items,
      maxVisible,
      searchInput,
      done,
    );

    const rebuild = () => {
      ({ list, container } = buildSelectContainer(
        theme,
        title,
        items,
        maxVisible,
        searchInput,
        done,
      ));
    };

    return {
      render: (w) => container.render(w),
      invalidate: () => container.invalidate(),

      handleInput: (data) => {
        if (matchesKey(data, Key.backspace)) {
          searchInput = searchInput.slice(0, -1);
          rebuild();
        } else if (data.length === 1 && data >= " ") {
          searchInput += data;
          rebuild();
        } else {
          list.handleInput(data);
        }
        tui.requestRender();
      },
    };
  });
}
