import type { TObject } from "typebox";

export type OrderByDirection = "ASC" | "DESC";

export type OrderBy = {
  column: string;
  direction: OrderByDirection;
};

export type SelectOpts = {
  limit?: number;
  offset?: number;
  orderBy?: OrderBy | OrderBy[];
};

export type TableSchema = {
  tableName: string;
  schema: TObject;
};

export type ColumnInfo = {
  name: string;
  type: string;
};

function typeToSql(type: string): string {
  switch (type) {
    case "integer":
      return "INTEGER";

    case "number":
      return "REAL";

    case "boolean":
      return "INTEGER";

    default:
      return "TEXT";
  }
}

export function schemaToCreateTable(
  tableName: string,
  schema: TObject,
): string {
  const cols = Object.entries(schema.properties)
    .map(([k, p]: [string, any]) => `${k} ${typeToSql(p.type)}`)
    .join(", ");

  return `CREATE TABLE IF NOT EXISTS ${tableName} (${cols});`;
}
