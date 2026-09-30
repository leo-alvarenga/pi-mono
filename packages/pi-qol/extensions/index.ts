import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { featureOptions, isFeatureEnabled, readQolConfig } from "./lib/config";
import type { QolFeature } from "./lib/types";

import externalEditorCwd from "./features/external-editor-cwd";

const FEATURES: QolFeature[] = [externalEditorCwd];

export default function (pi: ExtensionAPI) {
  const config = readQolConfig();
  for (const feature of FEATURES) {
    if (!isFeatureEnabled(config, feature.name)) continue;

    try {
      feature.register(pi, featureOptions(config, feature.name));
    } catch (error) {
      // One broken feature must not take the others down with it
      console.warn(
        `pi-qol: feature "${feature.name}" failed to register:`,
        error,
      );
    }
  }
}
