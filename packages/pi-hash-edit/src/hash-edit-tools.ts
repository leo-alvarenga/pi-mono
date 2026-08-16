import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const HASH_MISMATCH_ERROR = (startHash: string, endHash: string) =>
  `Hash Mismatch Error: Could not find start hash [${startHash}] or end hash [${endHash}] in file. The file has been modified since your last read. Please re-run hash_read.`;

/** 4-char hex hash of a line. Trailing whitespace trimmed so CRLF files hash the same as LF. */
export function getLineHash(lineContent: string): string {
  return createHash("sha256")
    .update(lineContent.trimEnd())
    .digest("hex")
    .slice(0, 4);
}

function resolvePath(cwd: string, p: string): string {
  return isAbsolute(p) ? p : resolve(cwd, p);
}

/** Read a file, prefixing every line with [hash] and its 1-indexed number */
export function hashRead(
  filePath: string,
  startLine?: number,
  endLine?: number,
): string {
  const content = readFileSync(filePath, "utf8"); // throws ENOENT when missing
  const lines = content.split("\n");

  const start = Math.max(0, (startLine ?? 1) - 1);
  const end =
    endLine === undefined ? lines.length : Math.min(lines.length, endLine);

  if (start >= end) {
    throw new Error(
      `Invalid range: startLine ${startLine ?? 1} is at or after endLine ${endLine ?? lines.length}.`,
    );
  }

  return lines
    .slice(start, end)
    .map((line, i) => `[${getLineHash(line)}] ${start + i + 1} | ${line}`)
    .join("\n");
}

/** Replace lines [startHash..endHash] with newContent. Aborts untouched when hashes no longer match disk */
export function hashEdit(
  filePath: string,
  startHash: string,
  endHash: string,
  newContent: string,
  displayPath = filePath,
): string {
  const lines = readFileSync(filePath, "utf8").split("\n");
  const hashes = lines.map(getLineHash);

  const startIndex = hashes.indexOf(startHash);
  const endIndex = startIndex === -1 ? -1 : hashes.indexOf(endHash, startIndex);

  if (startIndex === -1 || endIndex === -1) {
    return HASH_MISMATCH_ERROR(startHash, endHash);
  }

  const replacementLines = newContent.trimEnd().split("\n"); // no phantom blank line from a trailing newline

  lines.splice(startIndex, endIndex - startIndex + 1, ...replacementLines);
  writeFileSync(filePath, lines.join("\n"), "utf8");

  return `Successfully updated lines ${startIndex + 1} through ${endIndex + 1} in ${displayPath}`;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "hash_read",
    label: "Hash Read",
    description:
      "Reads a file from disk and outputs its content prefixed with line numbers and 4-character hashes (e.g. `[a1f2] 42 | const x = 10;`). Use this before calling hash_edit to obtain line hashes.",

    promptSnippet:
      "Read a file with per-line 4-character hashes for safe hash_edit targeting",

    promptGuidelines: [
      "Use hash_read before hash_edit to obtain the current line hashes.",
      "If hash_edit reports a hash mismatch, the file changed since your last read — re-run hash_read and retry.",
    ],

    parameters: Type.Object({
      path: Type.String({
        description: "Relative or absolute path to the file.",
      }),

      startLine: Type.Optional(
        Type.Integer({
          minimum: 1,
          description: "1-indexed line to start reading from.",
        }),
      ),

      endLine: Type.Optional(
        Type.Integer({
          minimum: 1,
          description: "1-indexed line to stop at (inclusive).",
        }),
      ),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const filePath = resolvePath(ctx.cwd, params.path);

      return {
        details: {},
        content: [
          {
            type: "text",
            text: hashRead(filePath, params.startLine, params.endLine),
          },
        ],
      };
    },
  });

  pi.registerTool({
    name: "hash_edit",
    label: "Hash Edit",

    description:
      "Replaces a block of text in a file by targeting a start line hash and an end line hash. If the hashes on disk do not match the expected start and end hashes, the edit fails safely without touching the file.",

    promptSnippet:
      "Replace a line block in a file, anchored by start/end line hashes",

    promptGuidelines: [
      "Use hash_edit only with startHash/endHash taken from a recent hash_read of the same file.",
      "If hash_edit reports a hash mismatch, the file changed — re-run hash_read and retry.",
    ],

    parameters: Type.Object({
      path: Type.String({ description: "File path to edit." }),
      newContent: Type.String({ description: "The replacement code block." }),

      startHash: Type.String({
        minLength: 4,
        maxLength: 4,
        description: "4-character hash of the first line to be replaced.",
      }),

      endHash: Type.String({
        minLength: 4,
        maxLength: 4,
        description: "4-character hash of the last line to be replaced.",
      }),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const filePath = resolvePath(ctx.cwd, params.path);

      return {
        details: {},
        content: [
          {
            type: "text",
            text: hashEdit(
              filePath,
              params.startHash,
              params.endHash,
              params.newContent,
              params.path,
            ),
          },
        ],
      };
    },
  });
}
