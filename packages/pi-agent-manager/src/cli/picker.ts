import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import type { SelectItem } from "@earendil-works/pi-tui";
import { Container, SelectList, Text } from "@earendil-works/pi-tui";

import type { AgentConfig } from "../agent/types";
import { getPermissionBadges, capitalize } from "./help";

/**
 * Open an interactive agent picker (arrows, type-to-filter, enter/esc).
 * Returns the chosen agent name, or null if cancelled.
 */
export async function openAgentPicker(
  ctx: ExtensionContext,
  agents: AgentConfig[],
  current: string,
): Promise<string | null> {
  const items: SelectItem[] = agents
    .filter((a) => !a.hidden)
    .map((agent) => {
      const isCurrent = agent.name === current;
      const label = `${agent.icon ? agent.icon + " " : ""}${capitalize(agent.name)}${
        isCurrent ? "  ● current" : ""
      }`;
      const description = `${getPermissionBadges(agent)}  ─  ${agent.description}`;
      return { value: agent.name, label, description };
    });

  return ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
    const container = new Container();

    container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
    container.addChild(
      new Text(theme.fg("accent", theme.bold("Select an agent")), 1, 0),
    );

    const list = new SelectList(items, Math.min(items.length, 10), {
      selectedPrefix: (t: string) => theme.fg("accent", t),
      selectedText: (t: string) => theme.fg("accent", t),
      description: (t: string) => theme.fg("dim", t),
      scrollInfo: (t: string) => theme.fg("dim", t),
      noMatch: (t: string) => theme.fg("warning", t),
    });

    list.onSelect = (item) => done(item.value);
    list.onCancel = () => done(null);
    container.addChild(list);

    container.addChild(
      new Text(
        theme.fg("dim", "↑↓ navigate · enter select · esc cancel · type to filter"),
        1,
        0,
      ),
    );
    container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

    return {
      render: (w: number) => container.render(w),
      invalidate: () => container.invalidate(),
      handleInput: (data: string) => {
        list.handleInput(data);
        tui.requestRender();
      },
    };
  });
}
