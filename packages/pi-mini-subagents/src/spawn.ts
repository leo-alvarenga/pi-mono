import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { buildAllowlist, buildSystemPrompt } from "./core";

export interface SubagentUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  contextTokens: number;
  turns: number;
}

export interface SubagentRunResult {
  /** Final assistant text from the subagent. */
  output: string;
  usage: SubagentUsage;
  model?: string;
  stopReason?: string;
  errorMessage?: string;
  exitCode: number;
  stderr: string;
  aborted: boolean;
}

const activeProcesses = new Set<ChildProcess>();

/** Signal every still-running subagent process (session shutdown cleanup). */
export function killAllRunning(): void {
  for (const proc of activeProcesses) {
    try {
      proc.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
}

/** Resolve the command that re-invokes pi (handles bun virtual scripts). */
function getPiInvocation(args: string[]): { command: string; args: string[] } {
  const currentScript = process.argv[1];
  const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
  if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
    return { command: process.execPath, args: [currentScript, ...args] };
  }
  const execName = path.basename(process.execPath).toLowerCase();
  const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
  if (!isGenericRuntime) return { command: process.execPath, args };
  return { command: "pi", args };
}

async function writePromptTempFile(
  prompt: string,
): Promise<{ dir: string; filePath: string }> {
  const dir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "pi-mini-subagent-"),
  );
  const filePath = path.join(dir, "prompt.md");
  await fs.promises.writeFile(filePath, prompt, {
    encoding: "utf-8",
    mode: 0o600,
  });
  return { dir, filePath };
}

/** Extract the last text part of an assistant message. */
function extractText(msg: any): string {
  const content = Array.isArray(msg?.content) ? msg.content : [];
  for (let i = content.length - 1; i >= 0; i--) {
    const part = content[i];
    if (part?.type === "text" && typeof part.text === "string")
      return part.text;
  }
  return "";
}

export interface RunSubagentOptions {
  cwd: string;
  task: string;
  allowWrite: boolean;
  answers?: string;
  signal?: AbortSignal;
}

/**
 * Spawn a transient headless pi subprocess, stream its JSON events, and
 * resolve with the final output once it exits.
 */
export async function runSubagent(
  opts: RunSubagentOptions,
): Promise<SubagentRunResult> {
  const prompt = buildSystemPrompt(opts.allowWrite);
  const { dir: tmpDir, filePath: tmpPath } = await writePromptTempFile(prompt);

  const taskText = opts.answers
    ? `Task: ${opts.task}\n\nAnswers from the user:\n${opts.answers}`
    : `Task: ${opts.task}`;

  const args = [
    "--mode",
    "json",
    "-p",
    "--no-session",
    "--tools",
    buildAllowlist(opts.allowWrite).join(","),
    "--append-system-prompt",
    tmpPath,
    taskText,
  ];

  const result: SubagentRunResult = {
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

  try {
    const exitCode = await new Promise<number>((resolve) => {
      const invocation = getPiInvocation(args);
      const proc = spawn(invocation.command, invocation.args, {
        cwd: opts.cwd,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, PI_SUBAGENT: "1" },
      });
      activeProcesses.add(proc);

      let buffer = "";
      const processLine = (line: string) => {
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
      };

      proc.stdout.on("data", (data) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) processLine(line);
      });

      proc.stderr.on("data", (data) => {
        result.stderr += data.toString();
      });

      proc.on("close", (code) => {
        activeProcesses.delete(proc);
        if (buffer.trim()) processLine(buffer);
        resolve(code ?? 0);
      });

      proc.on("error", () => {
        activeProcesses.delete(proc);
        resolve(1);
      });

      if (opts.signal) {
        const kill = () => {
          result.aborted = true;
          proc.kill("SIGTERM");
          setTimeout(() => {
            try {
              proc.kill("SIGKILL");
            } catch {
              /* already dead */
            }
          }, 5000);
        };
        if (opts.signal.aborted) kill();
        else opts.signal.addEventListener("abort", kill, { once: true });
      }
    });

    result.exitCode = exitCode;
    if (result.aborted) result.stopReason = "aborted";
    return result;
  } finally {
    try {
      fs.unlinkSync(tmpPath);
      fs.rmdirSync(tmpDir);
    } catch {
      /* ignore */
    }
  }
}
