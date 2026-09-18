import { describe, it, expect } from "vitest";
import { parseArgs } from "../state";

describe("parseArgs", () => {
  it("empty string → toggle to opposite", () => {
    expect(parseArgs("", false)).toEqual({ kind: "toggle", next: true });
    expect(parseArgs("", true)).toEqual({ kind: "toggle", next: false });
  });
  it("'ON' case-insensitive → set enabled", () => {
    expect(parseArgs("ON", false)).toEqual({ kind: "set", next: true });
    expect(parseArgs("on", false)).toEqual({ kind: "set", next: true });
  });
  it("'off' with trailing space → set disabled", () => {
    expect(parseArgs("off ", true)).toEqual({ kind: "set", next: false });
  });
  it("'status' → query current state", () => {
    expect(parseArgs("status", true)).toEqual({
      kind: "status",
      enabled: true,
    });
    expect(parseArgs("status", false)).toEqual({
      kind: "status",
      enabled: false,
    });
  });
  it("unknown input → invalid", () => {
    expect(parseArgs("gibberish", true).kind).toBe("invalid");
  });
});
