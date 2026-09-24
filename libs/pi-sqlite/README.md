# @leo-alvarenga/pi-sqlite

Lightweight SQLite wrapper for pi extensions. Define your schema with [TypeBox](https://github.com/sinclairzx81/typebox) and get a fully-typed local database with zero runtime dependencies.

Uses Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) (Node 22.13+ / Node 24+) and enables WAL mode by default for cross-process concurrency.

## Requirements

- Node 22.13+ or Node 24+
- `typebox` (peer dependency)

## Usage

### Persistent connection

```ts
import { SqliteDatabase } from "@leo-alvarenga/pi-sqlite";
import { Type } from "typebox";

const TaskSchema = Type.Object({
  id: Type.Integer(),
  done: Type.Boolean(),
  title: Type.String(),
});

const db = new SqliteDatabase("./tasks.db", [
  { tableName: "tasks", schema: TaskSchema },
]);

db.insert("tasks", { id: 1, title: "hello", done: false });

const open = db.select<{ id: number; title: string; done: number }>(
  "tasks",
  { done: 0 },
  { orderBy: "id", limit: 10 },
);

db.close();
```

### One-shot connection (auto-close)

Opens, runs and closes after it's done (or on error).

```ts
const count = SqliteDatabase.oneShot("./tasks.db", (db) => db.count("tasks"));

// Or if you want to create tables on the fly (if they don't exist)
const count = SqliteDatabase.oneShot("./tasks.db", (db) => db.count("tasks"), [
  { tableName: "tasks", schema: TaskSchema },
]);
```

## API

### `new SqliteDatabase(dbPath, schemas?)`

Opens the database, enables WAL mode, and runs `CREATE TABLE IF NOT EXISTS` for every entry in `schemas`. Safe to call repeatedly — `IF NOT EXISTS` makes it idempotent.

| Parameter | Type            | Description                                      |
| --------- | --------------- | ------------------------------------------------ |
| `dbPath`  | `string`        | Path to the `.db` file (created if missing)      |
| `schemas` | `TableSchema[]` | Optional list of `{ tableName, schema }` entries |

### Methods

| Method                                      | Description                                               |
| ------------------------------------------- | --------------------------------------------------------- |
| `insert(table, row)`                        | Insert a row                                              |
| `update(table, set, where)`                 | Update rows matching `where`                              |
| `delete(table, where)`                      | Delete rows matching `where`                              |
| `select(table, where?, opts?)`              | Select rows; `opts` supports `limit`, `offset`, `orderBy` |
| `count(table, where?)`                      | Count rows                                                |
| `raw(sql, params?)`                         | Execute arbitrary SQL and return rows                     |
| `createTable(table, schema)`                | Create a table from a TypeBox schema                      |
| `dropTable(table)`                          | Drop a table                                              |
| `getTableNames()`                           | List all table names                                      |
| `isValidTableName(name)`                    | Check if a name is a valid SQL identifier                 |
| `getColumnNames(table)`                     | Returns `{ name, type }[]` for each column                |
| `close()`                                   | Close the database connection                             |
| `SqliteDatabase.oneShot(path, schemas, fn)` | Static: open, run `fn`, close                             |

### TypeBox → SQLite type mapping

| TypeBox                          | SQLite                   |
| -------------------------------- | ------------------------ |
| `Type.String()`                  | `TEXT`                   |
| `Type.Integer()`                 | `INTEGER`                |
| `Type.Number()`                  | `REAL`                   |
| `Type.Boolean()`                 | `INTEGER` (0/1)          |
| `Type.Object()` / `Type.Array()` | `TEXT` (JSON-serialized) |

> **Note:** booleans are stored as `0`/`1`. When reading rows back, `done` will be `0` or `1`, not `false`/`true`. Cast explicitly if needed.

## Concurrency

WAL mode is enabled on every connection. This allows multiple readers and serialized writers at the SQLite level, safe for multiple processes hitting the same `.db` file. Within a single Node.js process, operations are serialized by the event loop.

## License

MIT
