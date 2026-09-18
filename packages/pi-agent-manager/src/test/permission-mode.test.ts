import { describe, it, expect } from "vitest";
import { permissionModeFor } from "../permission/evaluate";

describe("permissionModeFor", () => {
  it("catch-all deny → plan", () => {
    expect(
      permissionModeFor([{ permission: "*", pattern: "*", action: "deny" }]),
    ).toBe("plan");
  });
  it("catch-all allow + no ask rules → bypassPermissions", () => {
    expect(
      permissionModeFor([{ permission: "*", pattern: "*", action: "allow" }]),
    ).toBe("bypassPermissions");
  });
  it("catch-all allow + at least one ask → acceptEdits", () => {
    expect(
      permissionModeFor([
        { permission: "*", pattern: "*", action: "allow" },
        { permission: "write", pattern: "*", action: "ask" },
      ]),
    ).toBe("acceptEdits");
  });
  it("no rules (empty) → default", () => {
    expect(permissionModeFor([])).toBe("default");
  });
});
