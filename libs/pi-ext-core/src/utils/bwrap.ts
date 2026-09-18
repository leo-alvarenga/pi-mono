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

function buildDefaultBwrapArgs(
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
      spawnSync("bwrap", ["--version"], { stdio: "ignore" }).status === 0;
  }

  return _bwrapCache.available || false;
}

/**
 * Spawns a process with bubblewrap
 *
 * **Note:** This function will proceed to spawn a regular process if bubblewrap is not available.
 * This behavior can be changed by setting the `throwIfNotAvailable` option to `true`.
 *
 * @param command The command to run
 * @param args The arguments to pass to the command
 * @param spawnOpts The options to pass to the spawn function
 * @param bwrapOpts The options to pass to bubblewrapo
 * @returns The child process
 *
 * */
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

  return spawn("bwrap", [...bwrapArgs, "--", command, ...args], spawnOpts);
}
