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
    marginX: 1,
    paddingX: 2,
    prefix: "┃",
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
    prefixColor: "agentMode",
  },
};
