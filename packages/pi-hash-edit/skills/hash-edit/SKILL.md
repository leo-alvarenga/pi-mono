---
name: hash-edit
description: Prefer hash_read and hash_edit over the built-in read/write/edit tools when working with existing files — line-anchored 4-character hashes make silent corruption and line drift impossible. Load before reading or editing an existing file.
---

# Hash-Anchored File Editing

Use `hash_read` and `hash_edit` when working with **existing** files. Every line carries a 4-character hash; edits are anchored to hashes, so any drift between read and write fails loudly instead of corrupting.

## Workflow

1. `hash_read <path>` — add `startLine`/`endLine` to scope a region. Lines render as `[a1f2] 42 | const x = 10;`
2. `hash_edit <path> <startHash> <endHash> <newContent>` — using the hashes from step 1.

## Rules

- Always `hash_read` immediately before `hash_edit` — never reuse hashes from an earlier read.
- Replacing one line: use its hash as both `startHash` and `endHash`.
- Deleting lines: pass empty `newContent`.
- Identical lines share a hash — `hash_edit` targets the first occurrence; anchor with a unique line if needed.

## On mismatch

> Hash Mismatch Error: ... Please re-run hash_read.

The file changed since your last read. Do **not** force the edit — re-run `hash_read` and retry with fresh hashes.
