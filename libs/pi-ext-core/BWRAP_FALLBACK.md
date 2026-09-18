# Bwrap Fallback Implementation

## Issue

Subagents failed with `bwrap: setting up uid map: Permission denied` on systems where the bwrap binary exists but can't create user namespaces (VMs, WSL, restricted containers, unprivileged users).

## Solution

Three-file change for graceful degradation:

### 1. `src/utils/bwrap.ts` — Detect runtime spawn failures

- **Lines 37–48**: Try-catch wrapper around `spawn("bwrap", ...)` for synchronous errors
- **Lines 50–57**: Listen for async error event (permission denied, user namespace failures)
  - If `throwIfNotAvailable=true`: throw error with diagnostic
  - If `throwIfNotAvailable=false`: spawn regular process as fallback, store in `proc._bwrapFallback`
- **Line 58**: Return `fallbackProc ?? proc` (returns fallback if it was spawned, otherwise original)

**Why return original proc**: The error event is async, so we can't wait for it. The fallback is created asynchronously *after* this function returns. The utility below handles the transition.

### 2. `src/utils/process.ts` — Reusable fallback handler (NEW)

Generic utility for any process with a fallback pattern:

```typescript
attachProcessListeners(proc, {
  onStdout: (data) => /* ... */,
  onStderr: (data) => /* ... */,
  onClose: (code) => /* ... */,
  onError: () => /* ... */,
});
```

Behavior:
- Attaches listeners to `proc`
- If `proc` emits error and has a `_bwrapFallback` property:
  - Transfers all listeners to fallback instead
  - Executes normally without firing `onError`
- If no fallback: fires `onError` as normal

**~40 lines, zero boilerplate at call sites.**

### 3. `src/headless/run.ts` — Use the utility

Replace 20-line manual error handler with:

```typescript
attachProcessListeners(proc, {
  onStdout: (data) => reducer.feed(data.toString()),
  onStderr: (data) => { result.stderr += data.toString(); },
  onClose: (code) => {
    activeProcesses.delete(proc);
    reducer.end();
    resolve(code ?? 0);
  },
  onError: () => {
    activeProcesses.delete(proc);
    resolve(1);
  },
});
```

## Behavior

**Before:**
```
spawn("bwrap", ...) fails → error event → resolve(1) silently → subagent fails
```

**After:**
```
spawn("bwrap", ...) fails → error event → fallback spawned → listeners transfer to fallback
→ execute unsandboxed → subagent completes successfully
```

## Config

No new config. Existing `BubblewrapOptions.throwIfNotAvailable`:
- `false` (default): Fall back to regular spawn on bwrap failure
- `true`: Throw error if bwrap unavailable or fails at runtime

## Reusability

`attachProcessListeners` is a generic utility—use it anywhere you have a process with graceful degradation:
- Bwrap → regular spawn
- Sandbox → unsandboxed
- Primary service → fallback service
- Any error handler that needs to switch targets
