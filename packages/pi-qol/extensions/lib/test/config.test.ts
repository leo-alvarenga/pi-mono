import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { featureOptions, isFeatureEnabled, readQolConfig } from "../config";
import { unbindAction } from "../keybindings";
import { normalizeKeyId } from "../keys";
import { resolveKeyBinding } from "../../features/external-editor-cwd";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "pi-qol-test-"));
  process.env["PI_CODING_AGENT_DIR"] = tmpDir;
});

afterEach(() => {
  delete process.env["PI_CODING_AGENT_DIR"];
  rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
describe("isFeatureEnabled / featureOptions", () => {
  it("empty config -> enabled, empty options", () => {
    expect(isFeatureEnabled({}, "x")).toBe(true);
    expect(featureOptions({}, "x")).toEqual({});
  });

  it("disabled: false -> enabled", () => {
    expect(isFeatureEnabled({ x: { disabled: false } }, "x")).toBe(true);
  });

  it("disabled: true -> disabled", () => {
    expect(isFeatureEnabled({ x: { disabled: true } }, "x")).toBe(false);
  });

  it("disabled: 'yes' (non-literal-true) -> enabled", () => {
    expect(isFeatureEnabled({ x: { disabled: "yes" as unknown as boolean } }, "x")).toBe(true);
  });

  it("passes options through verbatim", () => {
    expect(featureOptions({ x: { keybinding: "alt+e" } }, "x")).toEqual({ keybinding: "alt+e" });
  });
});

// ---------------------------------------------------------------------------
describe("readQolConfig", () => {
  it("missing file -> {}", () => {
    expect(readQolConfig()).toEqual({});
  });

  it("malformed JSON -> {}", () => {
    writeFileSync(join(tmpDir, "pi-qol.json"), "{ bad json }");
    expect(readQolConfig()).toEqual({});
  });

  it("JSON array -> {}", () => {
    writeFileSync(join(tmpDir, "pi-qol.json"), "[1,2,3]");
    expect(readQolConfig()).toEqual({});
  });

  it("valid JSON with BOM -> parsed object", () => {
    writeFileSync(join(tmpDir, "pi-qol.json"), "\uFEFF" + JSON.stringify({ x: { disabled: true } }));
    expect(readQolConfig()).toEqual({ x: { disabled: true } });
  });
});

// ---------------------------------------------------------------------------
describe("normalizeKeyId", () => {
  it.each([
    ["ctrl+g", "ctrl+g"],
    ["Ctrl+G", "ctrl+g"],
    ["CTRL+G", "ctrl+g"],
    ["pageup", "pageUp"],
    ["ctrl+shift+e", "ctrl+shift+e"],
    ["escape", "escape"],
    ["f12", "f12"],
    ["ctrl+]", "ctrl+]"],
  ])("normalizeKeyId(%s) -> %s", (input, expected) => {
    expect(normalizeKeyId(input)).toBe(expected);
  });

  it.each([
    [""],
    ["ctrl+"],
    ["+g"],
    ["ctrl+ctrl+g"],
    ["foo+a"],
    ["ctrl+foo"],
    ["a+b+c+d+e+f"],
  ])("normalizeKeyId(%s) -> null", (input) => {
    expect(normalizeKeyId(input)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("resolveKeyBinding", () => {
  const noOp = {
    getBoundKeys: () => [] as (string[] | undefined)[],
    unbindAction: () => ({ ok: true as const, replaced: [] as (string | string[] | undefined)[] }),
  };
  const ctrlGBound = {
    getBoundKeys: () => [["ctrl+g"]] as (string[] | undefined)[],
    unbindAction: () => ({ ok: true as const, replaced: [["ctrl+g"]] as (string | string[] | undefined)[] }),
  };
  const writeFails = {
    getBoundKeys: () => [["ctrl+g"]] as (string[] | undefined)[],
    unbindAction: () => ({ ok: false as const, reason: "EPERM: permission denied" }),
  };

  it("{} -> ctrl+shift+e, no notice", () => {
    const notices: string[] = [];
    expect(resolveKeyBinding({}, notices, noOp)).toBe("ctrl+shift+e");
    expect(notices).toHaveLength(0);
  });

  it("{ keybinding: 'alt+e' } -> alt+e, no notice", () => {
    const notices: string[] = [];
    expect(resolveKeyBinding({ keybinding: "alt+e" }, notices, noOp)).toBe("alt+e");
    expect(notices).toHaveLength(0);
  });

  it("{ keybinding: 42 } -> ctrl+shift+e, notice", () => {
    const notices: string[] = [];
    expect(resolveKeyBinding({ keybinding: 42 }, notices, noOp)).toBe("ctrl+shift+e");
    expect(notices).toHaveLength(1);
  });

  it("{ keybinding: 'ctrl+' } -> ctrl+shift+e, notice (invalid)", () => {
    const notices: string[] = [];
    expect(resolveKeyBinding({ keybinding: "ctrl+" }, notices, noOp)).toBe("ctrl+shift+e");
    expect(notices[0]).toContain("invalid keybinding");
  });

  it("{ keybinding: 'ctrl+g' } without native -> ctrl+shift+e, notice mentions native", () => {
    const notices: string[] = [];
    expect(resolveKeyBinding({ keybinding: "ctrl+g" }, notices, noOp)).toBe("ctrl+shift+e");
    expect(notices[0]).toContain("native");
  });

  it("native, ctrl+g not in bound keys -> ctrl+g, no write, no notice", () => {
    const notices: string[] = [];
    expect(resolveKeyBinding({ keybinding: "native" }, notices, noOp)).toBe("ctrl+g");
    expect(notices).toHaveLength(0);
  });

  it("native, ctrl+g bound -> ctrl+shift+e, notice mentions /reload", () => {
    const notices: string[] = [];
    expect(resolveKeyBinding({ keybinding: "native" }, notices, ctrlGBound)).toBe("ctrl+shift+e");
    expect(notices[0]).toContain("/reload");
  });

  it("native, write fails -> ctrl+shift+e, notice carries reason", () => {
    const notices: string[] = [];
    expect(resolveKeyBinding({ keybinding: "native" }, notices, writeFails)).toBe("ctrl+shift+e");
    expect(notices[0]).toContain("EPERM");
  });
});

// ---------------------------------------------------------------------------
describe("unbindAction", () => {
  it("missing file -> creates file with { actionId: [] }", () => {
    const result = unbindAction(["app.editor.external"]);
    expect(result.ok).toBe(true);
    const content = JSON.parse(readFileSync(join(tmpDir, "keybindings.json"), "utf8"));
    expect(content["app.editor.external"]).toEqual([]);
  });

  it("existing bindings -> others preserved, target set to []", () => {
    writeFileSync(
      join(tmpDir, "keybindings.json"),
      JSON.stringify({ "app.editor.external": "ctrl+g", "other.action": "ctrl+k" }, null, 2),
    );
    const result = unbindAction(["app.editor.external"]);
    expect(result.ok).toBe(true);
    const content = JSON.parse(readFileSync(join(tmpDir, "keybindings.json"), "utf8"));
    expect(content["app.editor.external"]).toEqual([]);
    expect(content["other.action"]).toBe("ctrl+k");
  });

  it("malformed file -> { ok: false }, file byte-identical", () => {
    const malformed = "{ bad json }";
    writeFileSync(join(tmpDir, "keybindings.json"), malformed);
    const result = unbindAction(["app.editor.external"]);
    expect(result.ok).toBe(false);
    expect(readFileSync(join(tmpDir, "keybindings.json"), "utf8")).toBe(malformed);
  });
});
