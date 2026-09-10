/**
 * Renderer registry: the swap-in point. Register an editor-frame or header
 * implementation by name; the entry point resolves the configured name via
 * getEditorFrame/getHeader
 */
import type { EditorFrameFactory, HeaderRendererFactory } from "./types";
import { createHeader } from "../components/header";
import { BlockyEditor } from "../editor/blocky-editor";
import { MinimalistEditor } from "../editor/minimalist-editor";
import { CustomEditor } from "@earendil-works/pi-coding-agent";

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

registerHeader("basic", createHeader);
