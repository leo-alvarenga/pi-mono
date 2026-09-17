import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerHashTools } from "./tools";

export default async function (pi: ExtensionAPI) {
  registerHashTools(pi);
}
