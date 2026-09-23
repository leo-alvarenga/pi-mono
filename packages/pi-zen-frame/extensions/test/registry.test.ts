import { describe, it, expect } from "vitest";
import {
  getEditorFrame,
  getHeader,
  registerEditorFrame,
} from "../renderers/registry";

describe("registry built-ins", () => {
  it("linear editor frame is registered at load", () => {
    expect(getEditorFrame("linear")).toBeDefined();
  });
  it("minimalist editor frame is registered at load", () => {
    expect(getEditorFrame("minimalist")).toBeDefined();
  });
  it("zen header renderer is registered at load", () => {
    expect(getHeader("zen")).toBeDefined();
  });
});

describe("registerEditorFrame / getEditorFrame", () => {
  it("round-trips a custom factory", () => {
    const factory = () => ({}) as any;
    registerEditorFrame("test-custom-frame", factory);
    expect(getEditorFrame("test-custom-frame")).toBe(factory);
  });
  it("unknown key returns undefined", () => {
    expect(getEditorFrame("does-not-exist")).toBeUndefined();
  });
  it("duplicate registration overwrites silently", () => {
    const f1 = () => ({}) as any;
    const f2 = () => ({}) as any;
    registerEditorFrame("overwrite-me", f1);
    registerEditorFrame("overwrite-me", f2);
    expect(getEditorFrame("overwrite-me")).toBe(f2);
  });
});
