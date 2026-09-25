import type { ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { HeadlessRunResult, RunHeadlessAgentOptions } from "./types";
import { createEventReducer } from "./events";
import { getPiInvocation } from "./invocation";
import { spawnWithBubblewrap } from "../utils/bwrap";
import { attachProcessListeners } from "../utils/process";

const activeProcesses = new Set<ChildProcess>();

/** Signal every still-running headless process spawned by this consumer */
export function killAllRunning(): void {
  for (const proc of activeProcesses) {
    try {
      proc.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
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

/**
 * Spawn a transient headless pi subprocess, stream its JSON events, and
 * resolve with the final result once it exits
 */
export async function runHeadlessAgent(
  opts: RunHeadlessAgentOptions,
): Promise<HeadlessRunResult> {
  const { dir: tmpDir, filePath: tmpPath } = await writePromptTempFile(
    opts.systemPrompt,
  );

  const toolFlagAndArg: string[] = opts.tools?.length
    ? ["--tools", opts.tools.join(",")]
    : [];

  const args = [
    "--mode",
    "json",
    "-p",
    ...(opts.withSession ? [] : ["--no-session"]),
    ...(opts.model ? ["--model", opts.model] : []),
    ...(opts.thinking ? ["--thinking", opts.thinking] : []),
    ...toolFlagAndArg,
    "--append-system-prompt",
    tmpPath,
    opts.taskText,
  ];

  const reducer = createEventReducer();
  const result = reducer.result;

  try {
    const exitCode = await new Promise<number>((resolve) => {
      const invocation = getPiInvocation(args);

      const proc = spawnWithBubblewrap(
        invocation.command,
        invocation.args,
        {
          shell: false,
          cwd: opts.cwd,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            [opts.spawnFlagEnv]: "1",
            ...(opts.parentSessionId && {
              PI_PARENT_SESSION_ID: opts.parentSessionId,
            }),
          },
        },
        opts.bwrap,
      );

      activeProcesses.add(proc);

      attachProcessListeners(proc, {
        onStdout: (data) => reducer.feed(data.toString()),
        onStderr: (data) => {
          result.stderr += data.toString();
        },
        onClose: (code) => {
          reducer.end();
          activeProcesses.delete(proc);
          resolve(code ?? 1);
        },
      });

      opts.signal?.addEventListener("abort", () => {
        result.aborted = true;
        proc.kill("SIGTERM");
      });
    });

    result.exitCode = exitCode;

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
