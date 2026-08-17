import type { Settings } from "../types";
import { WORKING_MESSAGES } from "./messages";
export const DEFAULT_SETTINGS: Settings = {
  zenMode: false,
  accentColor: "accent",

  header: {
    enable: false,
    logoColor: "text",
    accentColor: "accent",

    heading: "Welcome back!",
    subheading:
      "Ready for your next session? Terminal warm, context clean, tools ready to execute",

    logo: ["█████████  ", "███   ███  ", "██████     ", "███     ███"],
  },

  workingMessage: {
    enable: true,
    intervalMs: 3000,
    messages: WORKING_MESSAGES,
  },

  frame: {
    icons: {},
    paddingX: 1,
    enable: true,
    minWidth: 20,
    marginTop: 0,
    showCwd: true,
    paddingTop: 1,
    marginBottom: 0,
    showModel: true,
    paddingBottom: 1,
    showSpinner: false,
    showContext: true,
    showThinking: true,
    showAgentMode: true,
    borderColor: "text",

    colors: {},
    // ponytail: colors were dormant (nothing read them); now wired — keep
    // defaults unset so segments keep their natural colors and zen-mode is
    // the mute switch.
  },
};
