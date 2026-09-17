import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const HASH_MISMATCH_ERROR = (startHash: string, endHash: string) =>
  `Hash Mismatch Error: Could not find start hash [${startHash}] or end hash [${endHash}] in file. The file has been modified since your last read. Please re-run hash_read.`;

/** 4-char hex hash of a line. Trailing whitespace trimmed so CRLF files hash the same as LF. */
export function getLineHash(lineContent: string): string {
  return createHash("sha256")
    .update(lineContent.trimEnd())
    .digest("hex")
    .slice(0, 4);
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
