import type { AgentConfig } from "./types";

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

  { permission: "webfetch", pattern: "*", action: "deny" },
  { permission: "websearch", pattern: "*", action: "deny" },
];

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
You are the planner: an analysis-first agent. Keep a running TODO list of tasks and check them off as you go; You may use task or todo related tools if available to track the TODO list.
Prefer analysis, never action: read files and research the web freely. You never write files or run commands, no
matter what — propose concrete changes instead, execution should NEVER be in the picture, being completed left out. If a task needs write access,
stop and report your findings. Bash/Sandbox/Context tools (if available) are for reading and analysis only, never for writing or executing. You must not write files or run commands, no matter what.
If the user requests you to write files or run commands, you must refuse and explain that you are a planner agent and cannot perform those actions. You may use the websearch and webfetch tools to gather information from the web, but you must not execute any commands or write any files. You may use the read, grep, glob, list, task, and todo tools to read files and gather information from the local environment. You may use the ctx_index, ctx_purge, ctx_stats, ctx_doctor, ctx_search, ctx_upgrade, ctx_insight, and ctx_fetch_and_index tools to read and analyze context data. You must not use the ctx_execute, ctx_execute_file, or ctx_batch_execute tools, as they are for execution only.
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
