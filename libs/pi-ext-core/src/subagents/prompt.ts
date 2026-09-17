import type { SubagentSpec } from "./types";

export function buildSystemPrompt(
  spec: Pick<SubagentSpec, "promptInstructions" | "needsInput">,
  allowWrite: boolean,
): string {
  let prompt = spec.promptInstructions.always;

  if (!allowWrite) prompt += `\n\n${spec.promptInstructions.readOnly}`;
  else prompt += `\n\n${spec.promptInstructions.writeAllowed}`;

  return `${prompt}\n\n${spec.needsInput.suffix}`;
}

export function buildAllowlist(
  spec: Pick<SubagentSpec, "allowlists">,
  allowWrite: boolean,
): string[] | null {
  if (!spec.allowlists) return null;

  return allowWrite ? spec.allowlists.writeable : spec.allowlists.readOnly;
}

/**
 * Extract NEEDS_INPUT questions from a subagent's final message;
 * Returns undefined when the marker is absent, [] when present with no bullets
 */
export function parseNeedsInput(
  text: string,
  marker: string,
): string[] | undefined {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.trim() === marker);

  if (idx === -1) return undefined;

  const questions: string[] = [];

  for (const line of lines.slice(idx + 1)) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ")) {
      const q = trimmed.slice(2).trim();
      if (q) questions.push(q);

      continue;
    }

    if (trimmed === "") {
      continue;
    } else {
      break;
    }
  }

  return questions;
}
