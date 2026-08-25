# @leo-alvarenga/pi-hash-edit

A [pi](https://github.com/earendil-works/pi-coding-agent) extension providing two tools,
`hash_read` and `hash_edit`, that eliminate code corruption and line drift by prefixing
every line of a file with a short 4-character hash.

The agent reads a file with `hash_read`, then targets replacements with the exact hashes.
If the file changed on disk in between, `hash_edit` refuses the edit: no silent drift.

## Install

```bash
pi install npm:@leo-alvarenga/pi-hash-edit
```

Restart pi or run `/reload`.

## Usage

1. `hash_read path [startLine] [endLine]` → lines as `[a1f2] 42 | const x = 10;`
2. `hash_edit path startHash endHash newContent` → replaces the block between the two hashes

A hash mismatch returns:

> Hash Mismatch Error: Could not find start hash [...] or end hash [...] in file. The file has been modified since your last read. Please re-run hash_read.

Notes:

- To replace a single line, pass its hash as both `startHash` and `endHash`.
- To delete lines, pass an empty `newContent`.
- Identical lines share a hash — `hash_edit` targets the first occurrence; anchor on a unique line if needed.

## How it works

- Hashes are 4 hex chars (16 bits) of sha256 over the line with trailing whitespace trimmed
  (CRLF- and LF-tolerant)
- Zero runtime dependencies beyond pi's bundled `typebox`; uses only `node:fs`, `node:crypto`, `node:path`

## Skill

The package also ships a `hash-edit` skill (`skills/hash-edit/SKILL.md`), auto-loaded
by pi. It instructs the agent to prefer `hash_read` / `hash_edit` over the built-in
read/write/edit tools when working with existing files, and to re-read before every edit.
