import type { AgentConfig, AgentState } from "./types";
import type { Ruleset } from "../permission/types";
import { agentToLabel } from "../cli/help";

export function buildAgentState(
  agent: AgentConfig,
  guardEnabled: boolean,
): AgentState {
  return {
    guardEnabled,
    currentAgent: agent.name,
    currentAgentConfig: agent,
    currentAgentLabel: agentToLabel(agent),
  };
}

export function findNextAgent(
  agents: AgentConfig[],
  currentName: string,
): AgentConfig | null {
  const idx =
    (agents.findIndex((a) => a.name === currentName) + 1) % agents.length;

  return agents[idx] ?? null;
}

export function findPreviousAgent(
  agents: AgentConfig[],
  currentName: string,
): AgentConfig | null {
  const idx =
    (agents.findIndex((a) => a.name === currentName) - 1 + agents.length) %
    agents.length;

  return agents[idx] ?? null;
}

export function isStepsBudgetExhausted(
  turn: number,
  maxSteps: number | undefined,
): boolean {
  return maxSteps != null && turn >= maxSteps;
}

export function mergeRulesets(...rulesets: Ruleset[]): Ruleset {
  return rulesets.reduce((acc, r) => [...acc, ...r], []);
}
