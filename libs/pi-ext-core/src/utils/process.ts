import type { ChildProcess } from "node:child_process";

export type ProcessListenerOptions = {
  onStdout?: (data: Buffer) => void;
  onStderr?: (data: Buffer) => void;
  onClose?: (code: number | null) => void;
  onError?: () => void;
  fallbackKey?: string; // property name to check for fallback process (defaults to "_bwrapFallback")
};

/**
 * Attach listeners to a process with automatic fallback support.
 *
 * If the process errors and has a fallback (stored in fallbackKey property),
 * listeners are transferred to the fallback instead of firing onError.
 * Useful for graceful degradation patterns (e.g., bwrap → regular spawn).
 *
 * @param proc The process to monitor
 * @param options Listeners and fallback key
 */
export function attachProcessListeners(
  proc: ChildProcess,
  options: ProcessListenerOptions = {},
): void {
  const fallbackKey = options.fallbackKey ?? "_bwrapFallback";

  const attach = (p: ChildProcess) => {
    if (options.onStdout) p.stdout?.on("data", options.onStdout);
    if (options.onStderr) p.stderr?.on("data", options.onStderr);
    // a spawn-failed proc may still emit "close"; its fallback reports instead
    if (options.onClose) {
      const onClose = options.onClose;
      p.on("close", (code) => {
        if (p === proc && (proc as any)[fallbackKey]) return;
        onClose(code);
      });
    }
    if (options.onError) p.on("error", options.onError);
  };

  proc.once("error", () => {
    const fallback = (proc as any)[fallbackKey] as ChildProcess | undefined;
    if (fallback) {
      attach(fallback);
    } else if (options.onError) {
      options.onError();
    }
  });

  attach(proc);
}
