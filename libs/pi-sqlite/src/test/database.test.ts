import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { SqliteDatabase } from "../database";

const userSchema = {
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    score: { type: "number" },
    active: { type: "boolean" },
  },
} as any;

type User = { id: number; name: string; score: number; active: number };

describe("SqliteDatabase", () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    db = new SqliteDatabase(":memory:", [
      { tableName: "users", schema: userSchema },
    ]);
  });

  afterEach(() => {
    db.close();
  });

  // --- Schema ops ---

  it("creates table from constructor schemas", () => {
    expect(db.getTableNames()).toContain("users");
  });

  it("createTable adds table; dropTable removes it", () => {
    db.createTable("items", { properties: { id: { type: "integer" } } } as any);
    expect(db.getTableNames()).toContain("items");
    db.dropTable("items");
    expect(db.getTableNames()).not.toContain("items");
  });

  it("getColumnNames returns name and SQL type", () => {
    expect(db.getColumnNames("users")).toEqual([
      { name: "id", type: "INTEGER" },
      { name: "name", type: "TEXT" },
      { name: "score", type: "REAL" },
      { name: "active", type: "INTEGER" },
    ]);
  });

  it("throws on invalid table identifier", () => {
    expect(() => db.createTable("bad-name!", userSchema)).toThrow();
    expect(() => db.select("1invalid")).toThrow();
  });

  // --- CRUD ---

  it("insert and select all rows", () => {
    db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
    const rows = db.select<User>("users");
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Alice");
    expect(rows[0].active).toBe(1);
  });

  it("select with where filter", () => {
    db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
    db.insert("users", { id: 2, name: "Bob", score: 7.0, active: false });
    const rows = db.select<User>("users", { name: "Alice" });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
  });

  it("update matching rows", () => {
    db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
    db.update("users", { name: "Alicia" }, { id: 1 });
    expect(db.select<User>("users", { id: 1 })[0].name).toBe("Alicia");
  });

  it("delete matching rows", () => {
    db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
    db.insert("users", { id: 2, name: "Bob", score: 7.0, active: false });
    db.delete("users", { id: 1 });
    expect(db.count("users")).toBe(1);
  });

  it("count with and without where", () => {
    db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
    db.insert("users", { id: 2, name: "Bob", score: 7.0, active: false });
    expect(db.count("users")).toBe(2);
    expect(db.count("users", { name: "Bob" })).toBe(1);
  });

  it("raw executes arbitrary SQL", () => {
    db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
    const rows = db.raw<{ name: string }>(
      "SELECT name FROM users WHERE id = ?",
      [1],
    );
    expect(rows[0].name).toBe("Alice");
  });

  // --- oneShot ---

  it("oneShot opens, runs, and closes the db", () => {
    const result = SqliteDatabase.oneShot(":memory:", (d) => {
      d.createTable("t", { properties: { v: { type: "integer" } } } as any);
      d.insert("t", { v: 42 });
      return d.select<{ v: number }>("t")[0].v;
    });
    expect(result).toBe(42);
  });

  // --- transaction ---

  it("transaction commits on success", () => {
    db.transaction((db) => {
      db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
      db.insert("users", { id: 2, name: "Bob", score: 7.0, active: false });
    });
    expect(db.count("users")).toBe(2);
  });

  it("transaction rolls back on error", () => {
    expect(() =>
      db.transaction((db) => {
        db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
        throw new Error("abort");
      })
    ).toThrow("abort");
    expect(db.count("users")).toBe(0);
  });

  it("transaction returns the callback result", () => {
    const result = db.transaction((db) => {
      db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
      return db.count("users");
    });
    expect(result).toBe(1);
  });

  it("savepoint rollback reverts partial work", () => {
    db.transaction((db, createSavepoint, rollbackSavepoint) => {
      db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
      const sp = createSavepoint();
      db.insert("users", { id: 2, name: "Bob", score: 7.0, active: false });
      rollbackSavepoint(sp);
    });
    expect(db.count("users")).toBe(1);
    expect(db.select<User>("users")[0].name).toBe("Alice");
  });

  it("savepoint release commits nested work", () => {
    db.transaction((db, createSavepoint, _rollback, releaseSavepoint) => {
      const sp = createSavepoint();
      db.insert("users", { id: 1, name: "Alice", score: 9.5, active: true });
      releaseSavepoint(sp);
    });
    expect(db.count("users")).toBe(1);
  });

  it("insert accepts a uuid factory function", () => {
    db.createTable("items", { properties: { id: { type: "string" }, label: { type: "string" } } } as any);
    db.insert("items", (uuid) => ({ id: uuid, label: "test" }));
    const rows = db.select<{ id: string; label: string }>("items");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rows[0].label).toBe("test");
  });
});
