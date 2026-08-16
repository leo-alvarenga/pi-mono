import { ThemeColor } from "@earendil-works/pi-coding-agent";
import type { BannerTip, FrameIcons, Settings, SpinnerPhase } from "./types";

export const CONFIG_FILE_NAME = "pi-zen-frame.json";

/** pi-agent-manager integration (optional — no hard dependency). */
export const PI_AGENT_MANAGER_AGENT_EVENT = "pi-agent-manager:agent-changed";
export const PI_AGENT_MANAGER_AGENT_DATA_KEY = "pi-agent-manager-agent";

/** Keybinding id users bind in keybindings.json to toggle zen mode. */
export const ZEN_MODE_SHORTCUT_ID = "piZenFrame.zenMode";
/** Default key when the user hasn't bound one (override or disable via
 *  keybindings.json; `[]` disables the shortcut, `/zen_mode` still works). */
export const ZEN_MODE_DEFAULT_KEY = "ctrl+shift+z";

/** Spinner animation frames per phase (pi-editor-shell style). */
export const SPINNER_FRAMES: Record<SpinnerPhase, string[]> = {
  idle: ["⠃", "⠞", "⡵", "⠿", "⢹", "⠄"],
  outputting: ["⠋", "⠙", "⠸", "⠴", "⠦", "⠇", "⠏"],
  thinking: ["󰌶", "󰌶", "󰌶", "󰌶", "󰌵", "󰌵", "󰌵", "󰌵"],
  toolcall: ["●", "●", "●", "●", "○", "○", "○", "○"],
  exec: ["⠂", "⠅", "⠍", "⠟", "⠿", "⠽", "⠿", "⠟", "⠍", "⠅", "⠂"],

  // Sample ["░", "▒", "▓", "█", "▓", "▒"],
};

/** Nerd Font defaults (override any subset via `frame.icons`). */
export const DEFAULT_ICONS: FrameIcons = {
  model: "󰣖",
  folder: " ",
  context: "",
  gitDirty: "",
  thinking: "󰌶",
  gitBranch: "",
};

/** Thinking level → theme token, mirroring pi's own border-color mapping. */
export const THINKING_TOKEN: Record<string, string> = {
  off: "thinkingOff",
  minimal: "thinkingMinimal",
  low: "thinkingLow",
  medium: "thinkingMedium",
  high: "thinkingHigh",
  xhigh: "thinkingXhigh",
  max: "thinkingMax",
};

/** Rotating messages for the working loader (single-word verbs; some silly, some plausible). */
export const WORKING_MESSAGES: string[] = [
  "Exploring",
  "Tinkering",
  "Searching",
  "Polishing",
  "Herding",
  "Consulting",
  "Chasing",
  "Rearranging",
  "Sharpening",
  "Reticulating",
  "Warming",
  "Feeding",
  "Whispering",
  "Counting",
  "Dusting",
  "Tightening",
  "Watering",
  "Aligning",
  "Reading",
  "Charging",
  "Summoning",
  "Calibrating",
  "Sorting",
  "Debating",
  "Brewing",
  "Stargazing",
  "Walking",
  "Folding",
  "Rounding",
  "Cooking",
  "Crunching",
  "Cogitating",
  "Analyzing",
  "Architecting",
  "Assembling",
  "Building",
  "Calculating",
  "Compiling",
  "Composing",
  "Crafting",
  "Decoding",
  "Designing",
  "Drafting",
  "Editing",
  "Evaluating",
  "Experimenting",
  "Explaining",
  "Extracting",
  "Generating",
  "Integrating",
  "Iterating",
  "Juggling",
  "Mapping",
  "Measuring",
  "Merging",
  "Modeling",
  "Navigating",
  "Optimizing",
  "Organizing",
  "Parsing",
  "Planning",
  "Pondering",
  "Processing",
  "Refactoring",
  "Refining",
  "Rendering",
  "Resolving",
  "Reviewing",
  "Scanning",
  "Sifting",
  "Simulating",
  "Streamlining",
  "Structuring",
  "Synthesizing",
  "Testing",
  "Tracing",
  "Translating",
  "Triaging",
  "Unraveling",
  "Validating",
  "Verifying",
  "Wrangling",
];

export const HEADER_TIPS: BannerTip[] = [
  {
    type: "Tip",
    text: "Press Ctrl + G inside Pi's input box to open your default system $EDITOR (e.g., Neovim) for writing long, complex prompts",
  },
  {
    type: "Did You Know?",
    text: "Model reasoning quality degrades as the context window fills up. Use /compact or start fresh sessions once context exceeds 50–60%",
  },
  {
    type: "Workflow",
    text: "Isolate planning from execution: use a read-only profile for architectural planning and switch to full permissions only when building",
  },
  {
    type: "Did You Know?",
    text: "Modern models like Claude 3.5 and 3.7 process boundaries in XML tags (<context>, <rules>, <code_diff>) significantly better than raw Markdown dividers",
  },
  {
    type: "Tip",
    text: "Always truncate or filter large log outputs before handing them to an agent—a 10,000-line stack trace will immediately saturate your token cache",
  },
  {
    type: "Tip",
    text: "Export global environment variables (like $EDITOR and $VISUAL) in ~/.bashenv (or your shell's env file) so background subshells and GUI-spawned processes inherit them cleanly",
  },
  {
    type: "Did You Know?",
    text: "Smooth 80ms Braille sequences (⠋, ⠙, ⠹, ⠸) or quadrant block meters give immediate visual feedback without consuming much screen real estate",
  },
  {
    type: "Prompting",
    text: "Tell models what TO DO instead of what NOT to do—negative constraints like 'don't use markdown' are frequently ignored compared to positive instructions",
  },
  {
    type: "Workflow",
    text: "Use fuzzy file references by typing `@` in Pi's input box to quickly anchor specific codebase files directly into the prompt context",
  },
  {
    type: "Tip",
    text: "Place heavy longform context or data files near the top of your prompt and put your actual instructions or questions at the very end for better accuracy",
  },
  {
    type: "Did You Know?",
    text: "Pi saves session history as a tree. You can use `/tree` or `/fork` to branch off a previous point in a conversation to test an alternative approach",
  },
  {
    type: "Prompting",
    text: "Define specific output formats (e.g., JSON schemas or concise bullet points) upfront to prevent models from generating unnecessary verbose prose",
  },
];

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

export const THEME_COLORS: Record<ThemeColor, true> = {
  accent: true,
  border: true,
  borderAccent: true,
  borderMuted: true,
  success: true,
  error: true,
  warning: true,
  muted: true,
  dim: true,
  text: true,
  searchMatchText: true,
  thinkingText: true,
  userMessageText: true,
  customMessageText: true,
  customMessageLabel: true,
  toolTitle: true,
  toolOutput: true,
  mdHeading: true,
  mdLink: true,
  mdLinkUrl: true,
  mdCode: true,
  mdCodeBlock: true,
  mdCodeBlockBorder: true,
  mdQuote: true,
  mdQuoteBorder: true,
  mdHr: true,
  mdListBullet: true,
  toolDiffAdded: true,
  toolDiffRemoved: true,
  toolDiffContext: true,
  syntaxComment: true,
  syntaxKeyword: true,
  syntaxFunction: true,
  syntaxVariable: true,
  syntaxString: true,
  syntaxNumber: true,
  syntaxType: true,
  syntaxOperator: true,
  syntaxPunctuation: true,
  thinkingOff: true,
  thinkingMinimal: true,
  thinkingLow: true,
  thinkingMedium: true,
  thinkingHigh: true,
  thinkingXhigh: true,
  thinkingMax: true,
  bashMode: true,
};
