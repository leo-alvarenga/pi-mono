import { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { PaletteItem } from "./types";

/** Number of palette rows rendered at once (the scroll window size) */
export const MAX_VISIBLE = 8;

const NATIVE_COMMANDS: PaletteItem[] = [
  {
    name: "/clear",
    description: "Clear the current conversation history",
    source: "native",
  },
  {
    name: "/reload",
    description: "Reload extensions, config, and keybindings",
    source: "native",
  },
  {
    name: "/settings",
    description: "Open the Pi settings TUI",
    source: "native",
  },
  {
    name: "/compact",
    description: "Compact the context window to save tokens",
    source: "native",
  },
  {
    name: "/fork",
    description: "Fork the current session into a new branch",
    source: "native",
  },
  {
    name: "/login",
    description: "Authenticate with a subscription provider",
    source: "native",
  },
  { name: "/quit", description: "Close the Pi harness", source: "native" },
];

export function loadPaletteItems(pi: ExtensionAPI): PaletteItem[] {
  return [
    ...NATIVE_COMMANDS,
    ...pi.getCommands().map((cmd) => ({
      ...cmd,
      name: `/${cmd.name}`,
    })),
  ];
}

export function filterPalette(items: PaletteItem[], q: string): PaletteItem[] {
  if (!q) return items;
  const lq = q.toLowerCase();

  return items.filter((it) =>
    it.name.toLowerCase().replaceAll("/", "").includes(lq),
  );
}
