import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { FeatureConfig } from "./config";

/** A self-contained QoL feature. `name` must match its `pi-qol.json` key. */
export interface QolFeature {
  name: string;
  register(pi: ExtensionAPI, options: FeatureConfig): void;
}
