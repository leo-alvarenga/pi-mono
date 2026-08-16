import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import type { Action, Ruleset } from "../permission/types";
import { evaluate, disabled, merge, permissionModeFor } from "../permission/evaluate";
import { TOOL_TO_PERMISSION, extractPattern } from "../permission/mapping";
import type { AgentConfig, AgentState } from "./types";
import { agentToLabel } from "../cli/help";
import { AGENT_CHANGED_EVENT, AGENT_DATA_KEY } from "../constants";

/**
 * Holds the currently active agent and enforces its permission ruleset.
 * The ruleset IS the contract — there's no injected policy block.
 *
 * - `deny` + `"*"` → tool physically stripped via pi.setActiveTools()
 * - `ask` → confirmation dialog (once / always / reject)
 * - `allow` → pass through
 *
 * "Always" approvals append runtime Rules to a session ruleset (last wins).
 */
export class AgentManager {
  private readonly agents: AgentConfig[];

  private currentAgent: string;
  private currentAgentConfig: AgentConfig;

  private allTools: string[] = [];
  private activeTools: string[] = [];

  /** Runtime rules from "always" approvals. Cleared on agent switch. */
  private sessionRuleset: Ruleset = [];

  private initialized = false;
  private turn = 0;

  /** Current agent's step budget (cached from config on switch). */
  private maxSteps?: number;

  /** Permission-guard flag: prepend XML envelope to system prompt when on. */
  private guardEnabled = false;

  constructor(agents: AgentConfig[]) {
    this.agents = agents.filter((a) => a.type === "primary");
    this.currentAgentConfig = this.agents[0];
    this.currentAgent = this.currentAgentConfig.name;
  }

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------

  initialize(pi: ExtensionAPI): void {
    if (this.initialized) return;
    this.allTools = pi.getAllTools().map((t) => t.name);
    this.initialized = true;
    this.syncActiveTools(pi);
  }

  // ------------------------------------------------------------------
  // Tool sync
  // ------------------------------------------------------------------

  private syncActiveTools(pi: ExtensionAPI): void {
    if (!this.initialized) return;
    this.allTools = pi.getAllTools().map((t) => t.name);
    const denied = disabled(
      this.allTools,
      TOOL_TO_PERMISSION,
      this.combinedRuleset(),
    );
    this.activeTools = this.allTools.filter((t) => !denied.has(t));
    pi.setActiveTools(this.activeTools);
  }

  // ------------------------------------------------------------------
  // Evaluation
  // ------------------------------------------------------------------

  private combinedRuleset(): Ruleset {
    return merge(this.currentAgentConfig.permissions, this.sessionRuleset);
  }

  resolve(toolName: string, args: Record<string, unknown>): Action {
    const permission = TOOL_TO_PERMISSION[toolName] ?? toolName;
    const pattern = extractPattern(toolName, args);
    return evaluate(permission, pattern, this.combinedRuleset()).action;
  }

  requiresConfirmation(
    toolName: string,
    args: Record<string, unknown>,
  ): boolean {
    return this.resolve(toolName, args) === "ask";
  }

  // ------------------------------------------------------------------
  // Session rules (always / reject)
  // ------------------------------------------------------------------

  approveAlways(
    toolName: string,
    args: Record<string, unknown>,
    pi: ExtensionAPI,
  ): void {
    this.sessionRuleset.push({
      permission: TOOL_TO_PERMISSION[toolName] ?? toolName,
      pattern: extractPattern(toolName, args),
      action: "allow",
    });
    this.syncActiveTools(pi);
  }

  deny(
    toolName: string,
    args: Record<string, unknown>,
    pi: ExtensionAPI,
  ): void {
    this.sessionRuleset.push({
      permission: TOOL_TO_PERMISSION[toolName] ?? toolName,
      pattern: extractPattern(toolName, args),
      action: "deny",
    });
    this.syncActiveTools(pi);
  }

  // ------------------------------------------------------------------
  // Agent switching
  // ------------------------------------------------------------------

  setAgent(name: string, pi: ExtensionAPI): number {
    const config = this.agents.find((a) => a.name === name.toLowerCase());
    if (!config) return 0;

    if (this.currentAgent !== config.name) this.turn += 1;

    this.currentAgent = config.name;
    this.currentAgentConfig = config;
    this.maxSteps = config.steps;

    this.sessionRuleset = [];
    this.syncActiveTools(pi);

    pi.appendEntry(AGENT_DATA_KEY, this.getState());
    pi.events.emit(AGENT_CHANGED_EVENT, this.getState());

    return this.turn;
  }

  setNextAgent(pi: ExtensionAPI): number {
    const idx =
      (this.agents.findIndex((a) => a.name === this.currentAgent) + 1) %
      this.agents.length;
    return this.setAgent(this.agents[idx].name, pi);
  }

  setPreviousAgent(pi: ExtensionAPI): number {
    const idx =
      (this.agents.findIndex((a) => a.name === this.currentAgent) -
        1 +
        this.agents.length) %
      this.agents.length;
    return this.setAgent(this.agents[idx].name, pi);
  }

  // ------------------------------------------------------------------
  // Steps
  // ------------------------------------------------------------------

  isStepsExhausted(): boolean {
    return this.maxSteps != null && this.turn >= this.maxSteps;
  }

  // ------------------------------------------------------------------
  // Permission guard
  // ------------------------------------------------------------------

  setGuardEnabled(enabled: boolean, pi: ExtensionAPI): void {
    this.guardEnabled = enabled;
    pi.appendEntry(AGENT_DATA_KEY, this.getState());
    pi.events.emit(AGENT_CHANGED_EVENT, this.getState());
  }

  getGuardEnabled(): boolean {
    return this.guardEnabled;
  }

  /** High-priority XML envelope describing the current allow/deny contract. */
  buildGuardEnvelope(): string {
    const families = new Set<string>();
    for (const tool of this.allTools) {
      families.add(TOOL_TO_PERMISSION[tool] ?? tool);
    }

    const ruleset = this.combinedRuleset();
    const allowed: string[] = [];
    const denied: string[] = [];
    for (const family of [...families].sort()) {
      const action = evaluate(family, "*", ruleset).action;
      if (action === "allow") allowed.push(family);
      else if (action === "deny") denied.push(family);
    }

    const cfg = this.currentAgentConfig;
    return [
      "<permission_overrides>",
      "CRITICAL INSTRUCTION: You MUST strictly adhere to these tool permissions. They override any default behaviors or instructions.",
      "",
      `ALLOWED_TOOLS: ${allowed.join(", ") || "(none)"}`,
      "",
      `DENIED_TOOLS: ${denied.join(", ") || "(none)"}`,
      "",
      `PERMISSION_MODE: ${permissionModeFor(ruleset)}`,
      "",
      `REASONING: ${agentToLabel(cfg)} - ${cfg.description}`,
      "</permission_overrides>",
    ].join("\n");
  }

  // ------------------------------------------------------------------
  // Accessors
  // ------------------------------------------------------------------

  getCurrentAgent(): string {
    return this.currentAgent;
  }

  getCurrentAgentConfig(): AgentConfig {
    return this.currentAgentConfig;
  }

  getAgentPersona(): string {
    return this.currentAgentConfig.prompt ?? "";
  }

  getAllowedTools(): string[] {
    return [...this.activeTools];
  }

  getTurnCounter(): number {
    return this.turn;
  }

  getSessionRuleset(): Ruleset {
    return [...this.sessionRuleset];
  }

  getState(): AgentState {
    const cfg = this.getCurrentAgentConfig();
    return {
      currentAgent: cfg.name,
      currentAgentLabel: agentToLabel(cfg),
      currentAgentConfig: cfg,
      guardEnabled: this.guardEnabled,
    };
  }
}

export function createAgentManager(agents: AgentConfig[]): AgentManager {
  return new AgentManager(agents);
}
