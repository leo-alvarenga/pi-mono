import { isAbsolute, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { getLineHash, hashRead, hashEdit } from "./hash";

function resolvePath(cwd: string, p: string): string {
  return isAbsolute(p) ? p : resolve(cwd, p);
}

export function registerHashTools(pi: ExtensionAPI): void {
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
