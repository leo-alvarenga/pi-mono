import { OrderBy, ValueOrFunction } from "./schema";

export function validateIdentifier(name?: string) {
  if (!name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: "${name}"`);
  }

  return true;
}

export function serialize(v: unknown): unknown {
  if (v === null || v === undefined) return null;

  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "object") return JSON.stringify(v);

  return v;
}

export function buildWhere(where?: Record<string, unknown>): {
  clause: string;
  values: unknown[];
} {
  if (!where) return { clause: "", values: [] };

  const keys = Object.keys(where);
  keys.forEach(validateIdentifier);

  return {
    clause: " WHERE " + keys.map((k) => `${k} = ?`).join(" AND "),
    values: Object.values(where).map(serialize),
  };
}

export function buildOrderBy(orderBy?: OrderBy | OrderBy[]) {
  if (!orderBy) return "";

  if (typeof orderBy === "string") {
    return orderBy;
  }

  const order = Array.isArray(orderBy) ? orderBy : [orderBy];

  order.forEach((o) => {
    validateIdentifier(o.column);

    // Safeguard against unsafe string assignment with casting
    validateIdentifier(o.direction);
  });

  return order.map((o) => `${o.column} ${o.direction}`).join(", ");
}

export function getResolvedRow<T extends object>(row: ValueOrFunction<T>): T {
  if (typeof row === "function") {
    return row(crypto.randomUUID());
  }

  return row;
}
