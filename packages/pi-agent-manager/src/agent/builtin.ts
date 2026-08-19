import type { AgentConfig } from "./types";

// ---------------------------------------------------------------------------
// Rulesets
// ---------------------------------------------------------------------------

const PLANNER: Required<Pick<AgentConfig, "permissions">>["permissions"] = [
  { permission: "*", pattern: "*", action: "deny" },
  { permission: "read", pattern: "*", action: "allow" },
  { permission: "grep", pattern: "*", action: "allow" },
  { permission: "glob", pattern: "*", action: "allow" },
  { permission: "list", pattern: "*", action: "allow" },
  { permission: "websearch", pattern: "*", action: "allow" },
  { permission: "webfetch", pattern: "*", action: "allow" },
  { permission: "task", pattern: "*", action: "allow" },
  { permission: "todo", pattern: "*", action: "allow" },

  // context-mode read-side tools: usable by the read (planner) agent
  { permission: "ctx_index", pattern: "*", action: "allow" },
  { permission: "ctx_purge", pattern: "*", action: "allow" },
  { permission: "ctx_stats", pattern: "*", action: "allow" },
  { permission: "ctx_doctor", pattern: "*", action: "allow" },
  { permission: "ctx_search", pattern: "*", action: "allow" },
  { permission: "ctx_upgrade", pattern: "*", action: "allow" },
  { permission: "ctx_insight", pattern: "*", action: "allow" },
  { permission: "ctx_fetch_and_index", pattern: "*", action: "allow" },

  // execution is write-only: keep context exec tools off the read agent
  { permission: "ctx_execute", pattern: "*", action: "deny" },
  { permission: "ctx_execute_file", pattern: "*", action: "deny" },
  { permission: "ctx_batch_execute", pattern: "*", action: "deny" },
];

const BUILDER: Required<Pick<AgentConfig, "permissions">>["permissions"] = [
  { permission: "*", pattern: "*", action: "allow" },
  { permission: "bash", pattern: "rm *", action: "ask" },
  { permission: "bash", pattern: "sudo *", action: "ask" },
  { permission: "bash", pattern: "chmod *", action: "ask" },
  { permission: "bash", pattern: "chown *", action: "ask" },
];

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export const BUILT_IN_AGENTS: AgentConfig[] = [
  {
    icon: "󱞁",
    name: "planner",
    type: "primary",
    color: "success",
    permissions: PLANNER,
    description:
      "Analysis-first agent: reads files and researches the web, keeps a running TODO list, and never writes files or runs commands — it proposes changes for a builder to execute.",
    prompt: `
You are the planner: an analysis-first agent. Keep a running TODO list of tasks and check them off as you go.
Prefer analysis over action: read files and research the web freely. You never write files or run commands, no
matter what — propose concrete changes instead, execution should NEVER be in the picture, being completed left out. If a task needs write access,
stop and report your findings.
`,
  },
  {
    icon: "󱁤",
    name: "builder",
    type: "primary",
    color: "error",
    permissions: BUILDER,
    description:
      "Execution-oriented agent: unrestricted file changes and commands, with destructive shell operations gated behind approval. Web tools are unavailable.",
    prompt: `
You are the builder: an execution-oriented agent. Read what you need, then implement — edit or create files, run
commands, and verify results. Prefer the smallest change that satisfies the task and test your work when feasible.
Web tools are unavailable; use your file tools and subagents. Report what you changed and what you verified.
`,
  },
];

export const DEFAULT_AGENT = BUILT_IN_AGENTS[0].name;
