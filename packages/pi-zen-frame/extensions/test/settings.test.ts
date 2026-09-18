import { describe, it, expect } from "vitest";
import { normalize } from "../config/settings";
import { DEFAULT_SETTINGS } from "../config/constants";

describe("normalize", () => {
  it("valid editorFrame string is passed through", () => {
    expect(normalize({ editorFrame: "minimalist" }).editorFrame).toBe("minimalist");
  });
  it("non-string editorFrame falls back to blocky", () => {
    expect(normalize({ editorFrame: 42 }).editorFrame).toBe("blocky");
    expect(normalize({ editorFrame: null }).editorFrame).toBe("blocky");
  });
  it("negative number for frame.minWidth falls back to default", () => {
    const s = normalize({ frame: { minWidth: -5 } });
    expect(s.frame?.minWidth).toBe(DEFAULT_SETTINGS.frame?.minWidth ?? 20);
  });
  it("non-finite number for frame.minWidth falls back to default", () => {
    const s = normalize({ frame: { minWidth: Infinity } });
    expect(s.frame?.minWidth).toBe(DEFAULT_SETTINGS.frame?.minWidth ?? 20);
  });
  it("invalid accentColor silently ignored, default used", () => {
    const s = normalize({ accentColor: "not-a-real-theme-color-xyz" });
    expect(s.accentColor).toBe(DEFAULT_SETTINGS.accentColor);
  });
  it("empty workingMessage.messages falls back to built-in pool", () => {
    const s = normalize({ workingMessage: { messages: [] } });
    expect((s.workingMessage?.messages ?? []).length).toBeGreaterThan(0);
  });
  it("non-boolean header.enable falls back to the default value", () => {
    const s = normalize({ header: { enable: "yes-please" } });
    expect(typeof s.header?.enable).toBe("boolean");
  });
  it("null/non-object input returns DEFAULT_SETTINGS", () => {
    expect(normalize(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalize("string")).toEqual(DEFAULT_SETTINGS);
  });
});
