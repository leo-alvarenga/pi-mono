import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { readJsonObject } from "./json";

export type QolConfig = Record<string, FeatureConfig | undefined>;
export type FeatureConfig = { disabled?: boolean; [option: string]: unknown };

export const QOL_CONFIG_FILE = "pi-qol.json";

export function getQolConfigPath(): string {
  return join(getAgentDir(), QOL_CONFIG_FILE);
}

export function readQolConfig(): QolConfig {
  return readJsonObject(getQolConfigPath()) as QolConfig;
}

/** All features are enabled unless explicitly disabled. */
export function isFeatureEnabled(config: QolConfig, feature: string): boolean {
  return config[feature]?.disabled !== true;
}

/** Options for one feature; `{}` when absent, so features never handle undefined. */
export function featureOptions(
  config: QolConfig,
  feature: string,
): FeatureConfig {
  return config[feature] ?? {};
}
