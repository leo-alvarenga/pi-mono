---
name: subagent
description: Delegate independent or high-output work to transient subagents via the mini_subagent tool. Use when a task can be parallelized or would flood the main context with raw output (repo-wide scans, large files, multi-part research); subagents report back only their findings.
---

# Using Subagents

The `mini_subagent` tool runs a transient headless `pi` process with its own
isolated context window and returns only its findings. Use it to protect your
main context and to parallelize independent work.

## When to delegate

- The task produces a lot of output you only need a summary of (large logs,
  repo-wide greps, multi-file analysis).
- Several independent questions that can run in parallel — one subagent per
  module, provider, route, or issue.
- Reading or analyzing big files whose raw bytes should not enter the main
  context.

## When NOT to delegate

- A one-line answer you can get from a single `read`/`grep` yourself.
- Work that depends on the main session's in-flight edits or reasoning — a
  subagent starts fresh with no session memory.
- Edits you must review carefully yourself: keep the subagent read-only and
  make the changes in the main context.

## Writing a good task

- Make it self-contained: state the goal, the files or directories, and the
  exact shape of the answer you want back.
- Use absolute or unambiguous paths — the subagent shares only a `cwd`, not
  your current reasoning.
- Ask for a summary, not a raw dump. That is the whole point.

## Read-only by default

Subagents can only `read`/`grep`/`find`/`ls` unless you set `allowWrite: true`.
Prefer read-only: have the subagent report findings, then edit in the main
context yourself.

## Parallel mode

Use `tasks` (array, max 8) when the work is independent. Run sequentially when
tasks share state or depend on each other's results.

## NEEDS_INPUT loop

If a subagent returns `needs_input`, it cannot proceed. Answer its questions
(ask the user if you don't know), then re-call with the same `task` and your
answers in `answers`. Never guess.
