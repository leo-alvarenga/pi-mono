export type Action = "allow" | "ask" | "deny";

export type Rule = {
  permission: string;
  pattern: string;
  action: Action;
};

/** Ordered list of Rules — last-matching-rule-wins. */
export type Ruleset = Rule[];

/** Maps pi tool names → permission-family keys for ruleset evaluation. */
export type ToolToPermission = Record<string, string>;
