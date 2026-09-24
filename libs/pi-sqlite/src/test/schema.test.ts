import { describe, it, expect } from "vitest";

import { schemaToCreateTable } from "../schema";

const schema = (props: Record<string, { type: string }>) =>
  ({ properties: props }) as any;

describe("schemaToCreateTable", () => {
  it("maps integer → INTEGER", () => {
    expect(schemaToCreateTable("t", schema({ id: { type: "integer" } }))).toBe(
      "CREATE TABLE IF NOT EXISTS t (id INTEGER);",
    );
  });

  it("maps number → REAL", () => {
    expect(
      schemaToCreateTable("t", schema({ score: { type: "number" } })),
    ).toBe("CREATE TABLE IF NOT EXISTS t (score REAL);");
  });

  it("maps boolean → INTEGER", () => {
    expect(
      schemaToCreateTable("t", schema({ active: { type: "boolean" } })),
    ).toBe("CREATE TABLE IF NOT EXISTS t (active INTEGER);");
  });

  it("maps unknown type → TEXT", () => {
    expect(schemaToCreateTable("t", schema({ name: { type: "string" } }))).toBe(
      "CREATE TABLE IF NOT EXISTS t (name TEXT);",
    );
  });

  it("handles multiple columns", () => {
    expect(
      schemaToCreateTable(
        "users",
        schema({
          id: { type: "integer" },
          name: { type: "string" },
          score: { type: "number" },
          active: { type: "boolean" },
        }),
      ),
    ).toBe(
      "CREATE TABLE IF NOT EXISTS users (id INTEGER, name TEXT, score REAL, active INTEGER);",
    );
  });
});
