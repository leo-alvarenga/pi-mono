import { DatabaseSync, DatabaseSyncOptions } from "node:sqlite";
import type { TObject } from "typebox";

import { schemaToCreateTable } from "./schema";
import type {
  TableSchema,
  ColumnInfo,
  SelectOpts,
  ValueOrFunction,
} from "./schema";
import {
  buildOrderBy,
  buildWhere,
  getResolvedRow,
  serialize,
  validateIdentifier,
} from "./query-helpers";

export class SqliteDatabase {
  private db: DatabaseSync;

  constructor(
    dbPath: string,
    schemas: TableSchema[] = [],
    sqliteOverrides?: Partial<DatabaseSyncOptions>,
  ) {
    this.db = new DatabaseSync(dbPath, sqliteOverrides ?? {});
    this.db.exec("PRAGMA journal_mode=WAL");

    for (const { tableName, schema } of schemas) {
      this.db.exec(schemaToCreateTable(tableName, schema));
    }
  }

  open(): void {
    if (this.db.isOpen) return;

    this.db.open();
  }

  close(): void {
    if (!this.db.isOpen) return;

    this.db.close();
  }

  // --- Schema ops ---

  createTable(tableName: string, schema: TObject): void {
    validateIdentifier(tableName);
    this.db.exec(schemaToCreateTable(tableName, schema));
  }

  dropTable(tableName: string): void {
    validateIdentifier(tableName);
    this.db.exec(`DROP TABLE IF EXISTS ${tableName}`);
  }

  getTableNames(): string[] {
    const rows = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as { name: string }[];

    return rows.map((r) => r.name);
  }

  getColumnNames(tableName: string): ColumnInfo[] {
    validateIdentifier(tableName);

    const rows = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as {
      name: string;
      type: string;
    }[];

    return rows.map((r) => ({ name: r.name, type: r.type }));
  }

  // --- CRUD ---

  /**
   * Inserts a row and returns the last inserted row id
   * @param tableName
   * @param row Row to insert. Can be a function that returns a row based on a random UUID or the row itself
   * @returns rowid
   */
  insert<T extends object>(tableName: string, row: ValueOrFunction<T>) {
    validateIdentifier(tableName);

    const value = getResolvedRow(row);
    const keys = Object.keys(value);
    keys.forEach(validateIdentifier);

    const placeholders = keys.map(() => "?").join(", ");
    const values = Object.values(value).map(serialize);

    return this.db
      .prepare(
        `INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${placeholders})`,
      )
      .run(...(values as any[])).lastInsertRowid;
  }

  update<T extends object>(
    tableName: string,
    set: Partial<T>,
    where: Partial<T>,
  ): void {
    validateIdentifier(tableName);

    const setKeys = Object.keys(set);
    setKeys.forEach(validateIdentifier);

    const setValues = Object.values(set).map(serialize);
    const setClause = setKeys.map((k) => `${k} = ?`).join(", ");

    const { clause: whereClause, values: whereValues } = buildWhere(
      where as Record<string, unknown>,
    );

    this.db
      .prepare(`UPDATE ${tableName} SET ${setClause}${whereClause}`)
      .run(...([...setValues, ...whereValues] as any[]));
  }

  delete(tableName: string, where: Record<string, unknown>): void {
    validateIdentifier(tableName);
    const { clause, values } = buildWhere(where);

    this.db
      .prepare(`DELETE FROM ${tableName}${clause}`)
      .run(...(values as any[]));
  }

  select<T>(tableName: string, where?: Partial<T>, opts?: SelectOpts): T[] {
    validateIdentifier(tableName);

    const { clause, values } = buildWhere(where as Record<string, unknown>);

    let sql = `SELECT * FROM ${tableName}${clause}`;

    if (opts?.orderBy) {
      sql += ` ORDER BY ${buildOrderBy(opts.orderBy)}`;
    }

    if (opts?.limit != null) {
      sql += ` LIMIT ${opts.limit}`;
    }

    if (opts?.offset != null) {
      sql += ` OFFSET ${opts.offset}`;
    }

    return this.db.prepare(sql).all(...(values as any[])) as T[];
  }

  count(tableName: string, where?: Record<string, unknown>): number {
    validateIdentifier(tableName);

    const { clause, values } = buildWhere(where);

    const row = this.db
      .prepare(`SELECT COUNT(*) as count FROM ${tableName}${clause}`)
      .get(...(values as any[])) as { count: number };

    return row.count;
  }

  /**
   * Executes a function in a transaction. Rolls back on error.
   * @param fn Function to execute in a transaction; receives helpers to create, rollback, and release savepoints
   * @returns Result of the function
   */
  transaction<R>(
    fn: (
      db: SqliteDatabase,
      createSavepoint: (name?: string) => string,
      rollbackSavepoint: (name: string) => void,
      releaseSavepoint: (name: string) => void,
    ) => R,
  ): R {
    let sp_count = 0;
    this.db.exec("BEGIN TRANSACTION");

    try {
      const result = fn(
        this,

        (name = `savepoint_${++sp_count}_${Date.now()}`) => {
          this.db.exec(`SAVEPOINT ${name}`);
          return name;
        },

        (name) => {
          this.db.exec(`ROLLBACK TO ${name}`);
        },

        (name) => {
          this.db.exec(`RELEASE ${name}`);
        },
      );

      this.db.exec("COMMIT TRANSACTION");

      return result;
    } catch (err) {
      this.db.exec("ROLLBACK TRANSACTION");

      throw err;
    }
  }

  raw<T = unknown>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...(params as any[])) as T[];
  }

  // --- One-shot variant ---

  static oneShot<R>(
    dbPath: string,
    fn: (db: SqliteDatabase) => R,
    schemas?: TableSchema[],
  ): R {
    const db = new SqliteDatabase(dbPath, schemas ?? []);

    try {
      return fn(db);
    } finally {
      db.close();
    }
  }
}
