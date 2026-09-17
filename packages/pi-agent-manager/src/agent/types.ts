import type { ThemeColor } from "@earendil-works/pi-coding-agent";
import type { Ruleset } from "../permission/types";

export type AgentType = "primary" | "subagent";

export type AgentConfig = {
  name: string;
  icon?: string;
  steps?: number;
  type: AgentType;
  prompt?: string;
  hidden?: boolean;
  color?: ThemeColor;
  description: string;
  permissions: Ruleset;
};

export type AgentState = {
  currentAgent: string;
  guardEnabled: boolean;
  currentAgentLabel: string;
  currentAgentConfig: AgentConfig;
};
