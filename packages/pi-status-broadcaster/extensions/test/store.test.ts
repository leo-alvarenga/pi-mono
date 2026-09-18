import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { ensureFile, readReport, writeReport } from "../store";

const REPORT_PATH = "/tmp/pi-status-broadcaster/status.json";
const tmpFile = `${REPORT_PATH}.${process.pid}.tmp`;

beforeEach(() => {
  [REPORT_PATH, tmpFile].forEach((p) => {
    try {
      unlinkSync(p);
    } catch {}
  });
});

afterEach(() => {
  [REPORT_PATH, tmpFile].forEach((p) => {
    try {
      unlinkSync(p);
    } catch {}
  });
});

describe("store", () => {
  it("readReport on missing file returns {}", () => {
    expect(readReport()).toEqual({});
  });
  it("readReport on malformed JSON returns {}", () => {
    ensureFile();
    writeFileSync(REPORT_PATH, "{ not valid json }", "utf8");
    expect(readReport()).toEqual({});
  });
  it("writeReport then readReport round-trips correctly", () => {
    ensureFile();
    const data = { "sess-1": { id: "sess-1", status: "IDLE" } as any };
    writeReport(data);
    expect(readReport()).toEqual(data);
  });
  it("no .tmp file left behind after successful write", () => {
    ensureFile();
    writeReport({});
    expect(existsSync(tmpFile)).toBe(false);
  });
  it("ensureFile called twice is idempotent", () => {
    ensureFile();
    ensureFile();
    expect(existsSync(REPORT_PATH)).toBe(true);
  });
});
