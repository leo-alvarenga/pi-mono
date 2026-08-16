import type { ThemeColor } from "@earendil-works/pi-coding-agent";
import type { Ruleset } from "../permission/types";

export type AgentType = "primary" | "subagent";

export type AgentConfig = {
  name: string;
  icon?: string;
  type: AgentType;
  color?: ThemeColor;
  description: string;
  permissions: Ruleset;
  prompt?: string;
  hidden?: boolean;
  steps?: number;
};

export type AgentState = {
  currentAgent: string;
  currentAgentLabel: string;
  currentAgentConfig: AgentConfig;
  guardEnabled: boolean;
};
