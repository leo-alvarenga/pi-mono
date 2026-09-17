import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { HeadlessRunResult, RunHeadlessAgentOptions } from "./types";
import { createEventReducer } from "./events";
import { getPiInvocation } from "./invocation";

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
    "--no-session",
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

      const proc = spawn(invocation.command, invocation.args, {
        shell: false,
        cwd: opts.cwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, [opts.spawnFlagEnv]: "1" },
      });

      activeProcesses.add(proc);

      proc.stdout.on("data", (data: Buffer) => reducer.feed(data.toString()));

      proc.stderr.on("data", (data: Buffer) => {
        result.stderr += data.toString();
      });

      proc.on("close", (code: number | null) => {
        activeProcesses.delete(proc);
        reducer.end();
        resolve(code ?? 0);
      });

      proc.on("error", () => {
        activeProcesses.delete(proc);
        resolve(1);
      });

      if (opts.signal) {
        let killTimer: ReturnType<typeof setTimeout> | undefined;

        const kill = () => {
          result.aborted = true;
          proc.kill("SIGTERM");

          killTimer = setTimeout(() => {
            try {
              proc.kill("SIGKILL");
            } catch {
              /* already dead */
            }
          }, 5000);

          killTimer.unref?.();
        };

        if (opts.signal.aborted) {
          kill();
        } else {
          opts.signal.addEventListener("abort", kill, { once: true });

          proc.on("close", () =>
            opts.signal!.removeEventListener("abort", kill),
          );
        }
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
