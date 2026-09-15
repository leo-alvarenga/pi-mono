import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

import type { ReportSchema } from "./types";

const REPORT_PATH = "/tmp/pi-status-broadcaster/status.json";

export function ensureFile(): void {
  mkdirSync(dirname(REPORT_PATH), { recursive: true });

  if (!existsSync(REPORT_PATH)) writeFileSync(REPORT_PATH, "{}");
}

export function readReport(): ReportSchema {
  try {
    return JSON.parse(readFileSync(REPORT_PATH, "utf8")) as ReportSchema;
  } catch {
    return {};
  }
}

export function writeReport(data: ReportSchema): void {
  try {
    const tmp = `${REPORT_PATH}.${process.pid}.tmp`;

    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, REPORT_PATH);
  } catch {
    //
  }
}
