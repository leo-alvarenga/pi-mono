import type { Settings } from "../types";
import { WORKING_MESSAGES } from "./messages";
export const DEFAULT_SETTINGS: Settings = {
  zenMode: false,
  accentColor: "accent",
  editorFrame: "blocky",

  header: {
    enable: false,
    type: "basic",
  },

  workingMessage: {
    enable: true,
    intervalMs: 3000,
    messages: WORKING_MESSAGES,
  },

  frame: {
    enable: true,
    minWidth: 20,
    showCwd: true,
    showModel: true,
    showContext: true,
    showThinking: true,
    showAgentMode: true,
    showSpinner: false,
  },
};
