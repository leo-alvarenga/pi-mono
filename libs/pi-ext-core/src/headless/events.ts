import type { HeadlessRunResult } from "../types";

function extractText(msg: unknown): string {
  const content = Array.isArray((msg as any)?.content)
    ? (msg as any).content
    : [];
  for (let i = content.length - 1; i >= 0; i--) {
    const part = content[i];
    if (part?.type === "text" && typeof part.text === "string")
      return part.text;
  }
  return "";
}

function makeEmptyResult(): HeadlessRunResult {
  return {
    output: "",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      cost: 0,
      contextTokens: 0,
      turns: 0,
    },
    exitCode: 0,
    stderr: "",
    aborted: false,
  };
}

/**
 * Line-buffered JSON event reducer for headless pi output.
 * Consumer: pi-mini-subagents.
 */
export function createEventReducer(): {
  feed(chunk: string): void;
  end(): void;
  result: HeadlessRunResult;
} {
  const result = makeEmptyResult();
  let buffer = "";

  function processLine(line: string): void {
    if (!line.trim()) return;
    let event: any;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }

    if (event.type === "message_end" && event.message) {
      const msg = event.message;
      if (msg.role === "assistant") {
        result.usage.turns++;
        const usage = msg.usage;
        if (usage) {
          result.usage.input += usage.input || 0;
          result.usage.output += usage.output || 0;
          result.usage.cacheRead += usage.cacheRead || 0;
          result.usage.cacheWrite += usage.cacheWrite || 0;
          result.usage.cost += usage.cost?.total || 0;
          result.usage.contextTokens = usage.totalTokens || 0;
        }
        if (!result.model && msg.model) result.model = msg.model;
        if (msg.stopReason) result.stopReason = msg.stopReason;
        if (msg.errorMessage) result.errorMessage = msg.errorMessage;
        result.output = extractText(msg);
      }
    }
  }

  return {
    result,
    feed(chunk: string): void {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) processLine(line);
    },
    end(): void {
      if (buffer.trim()) processLine(buffer);
      buffer = "";
    },
  };
}
