import { SlashCommandInfo } from "@earendil-works/pi-coding-agent";

export type PaletteItem = Omit<SlashCommandInfo, "source" | "sourceInfo"> & {
  source: SlashCommandInfo["source"] | "native";
};

export type PaletteState = {
  query: string;
  viewTop: number;
  selected: number;
  all: PaletteItem[];
  items: PaletteItem[];
};
