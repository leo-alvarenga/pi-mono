import * as fs from "node:fs";
import * as path from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import {
  spawn,
  spawnSync,
  type ChildProcess,
  type SpawnOptions,
} from "node:child_process";
import { hasTimeElapsed } from "./time";
import type { BubblewrapOptions } from "../types";

type BwrapCache = {
  lastCheck?: Date;
  available?: boolean;
};

const CACHE_TTL = 10 * 60 * 1000; // 10 min in ms

/** Agent-dir entries that hold code or skills the sandbox must not modify */
const AGENT_DIR_READONLY_SUBDIRS = [
  "extensions",
  "npm",
  "git",
  "skills",
  "themes",
];

const _bwrapCache: BwrapCache = {};

function hasBubblewrapCacheExpired() {
  return (
    _bwrapCache.lastCheck && hasTimeElapsed(_bwrapCache.lastCheck, CACHE_TTL)
  );
}

function resetBubblewrapCache() {
  _bwrapCache.lastCheck = undefined;
  _bwrapCache.available = undefined;
}

export function buildDefaultBwrapArgs(
  cwd: string | undefined,
  allowWrite: boolean,
): string[] {
  const args = [
    "--ro-bind",
    "/",
    "/",
    "--dev",
    "/dev",
    "--proc",
    "/proc",
    "--bind",
    "/tmp",
    "/tmp",
  ];

  if (allowWrite && cwd) args.push("--bind", cwd, cwd);

  // Pi needs to write lock files (settings/auth/models) and refresh OAuth
  // tokens under its agent dir; without this, config fails to load with
  // EROFS and the child reports "No API key found".
  const agentDir = getAgentDir();
  args.push("--bind", agentDir, agentDir);

  // Keep executable content read-only so a read-only subagent cannot plant code
  for (const sub of AGENT_DIR_READONLY_SUBDIRS) {
    const p = path.join(agentDir, sub);
    if (fs.existsSync(p)) args.push("--ro-bind", p, p);
  }

  return args;
}

/**
 * Checks if bubblewrap is available
 *
 * @param resetCache If true, the cache will be reset
 * @returns True if bubblewrap is available, false otherwise
 */
export function isBubblewrapAvailable(resetCache?: boolean) {
  if (resetCache || hasBubblewrapCacheExpired()) resetBubblewrapCache();

  if (_bwrapCache.available === undefined) {
    _bwrapCache.lastCheck = new Date();

    _bwrapCache.available =
      spawnSync(
        "bwrap",
        [
          "--ro-bind",
          "/",
          "/",
          "--dev",
          "/dev",
          "--proc",
          "/proc",
          "--bind",
          "/tmp",
          "/tmp",
          "true",
        ],
        { stdio: "ignore" },
      ).status === 0;
  }

  return _bwrapCache.available || false;
}

/**
 * Spawns a process with bubblewrap, with fallback on runtime spawn failures
 *
 * **Note:** This function attempts to spawn with bubblewrap for sandboxing.
 * If bubblewrap is unavailable or fails at runtime (e.g., user namespace permissions),
 * it will fall back to regular spawn unless `throwIfNotAvailable` is true.
 *
 * @param command The command to run
 * @param args The arguments to pass to the command
 * @param spawnOpts The options to pass to the spawn function
 * @param bwrapOpts The options to pass to bubblewrap
 * @returns The child process (or a fallback if bwrap fails at runtime)
 * @throws Error if bwrap is unavailable and throwIfNotAvailable is true
 */
export function spawnWithBubblewrap(
  command: string,
  args: string[],
  spawnOpts: SpawnOptions,
  bwrapOpts?: BubblewrapOptions,
): ChildProcess {
  if (!bwrapOpts || !isBubblewrapAvailable()) {
    if (bwrapOpts && bwrapOpts.throwIfNotAvailable) {
      throw new Error("bwrap is not available");
    }

    return spawn(command, args, spawnOpts);
  }

  const cwd = typeof spawnOpts.cwd === "string" ? spawnOpts.cwd : undefined;

  const bwrapArgs =
    bwrapOpts.bwrapArgs ??
    buildDefaultBwrapArgs(cwd, bwrapOpts.allowWrite ?? false);

  let proc: ChildProcess;

  // if proc fails, return fallbackProc
  let fallbackProc: undefined | ChildProcess = undefined;

  try {
    proc = spawn("bwrap", [...bwrapArgs, "--", command, ...args], spawnOpts);

    // Handle runtime spawn failures (e.g., user namespace permission denied)
    proc.once("error", () => {
      if (bwrapOpts.throwIfNotAvailable) return;

      fallbackProc = spawn(command, args, spawnOpts);

      // Signal fallback occurred (headless/run can track this)
      (proc as any)._bwrapFallback = fallbackProc;
    });
  } catch (err) {
    // Synchronous spawn error (e.g., bwrap binary issues)
    if (bwrapOpts.throwIfNotAvailable) {
      throw new Error(
        `bwrap spawn failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return spawn(command, args, spawnOpts);
  }

  return fallbackProc ?? proc;
}
