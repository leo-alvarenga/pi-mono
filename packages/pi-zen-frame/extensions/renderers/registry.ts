/**
 * Renderer registry: the swap-in point. Register an editor-frame or header
 * implementation by name; the entry point resolves the configured name via
 * getEditorFrame/getHeader
 */
import type { EditorFrameFactory, HeaderRendererFactory } from "./types";

import { BlockyEditor, LinearEditor, MinimalistEditor } from "../editor";
import { createBoxHeader, createZenHeader } from "../headers";

const editorFrames = new Map<string, EditorFrameFactory>();
const headers = new Map<string, HeaderRendererFactory>();

export function registerEditorFrame(
  name: string,
  factory: EditorFrameFactory,
): void {
  editorFrames.set(name, factory);
}

export function registerHeader(
  name: string,
  factory: HeaderRendererFactory,
): void {
  headers.set(name, factory);
}

export function getEditorFrame(name: string): EditorFrameFactory | undefined {
  return editorFrames.get(name);
}

export function getHeader(name: string): HeaderRendererFactory | undefined {
  return headers.get(name);
}

// ── built-ins ─────────────────────────────────────────────────────────────
registerEditorFrame(
  "blocky",
  (pi, provider, opts, ...args) =>
    new BlockyEditor(pi, provider, opts, ...args),
);

registerEditorFrame(
  "minimalist",
  (pi, provider, opts, ...args) =>
    new MinimalistEditor(pi, provider, opts, ...args),
);

registerEditorFrame(
  "linear",
  (pi, provider, opts, ...args) =>
    new LinearEditor(pi, provider, opts, ...args),
);

registerHeader("box", createBoxHeader);
registerHeader("zen", createZenHeader);
