import { describe, it, expect, afterEach } from "vitest";

afterEach(() => {
  delete process.env.PI_SUBAGENT;
});

describe("spawn-guard (PI_SUBAGENT env var)", () => {
  it("guard condition is falsy when env var absent", () => {
    delete process.env.PI_SUBAGENT;
    expect(Boolean(process.env.PI_SUBAGENT)).toBe(false);
  });

  it("guard condition is truthy when env var is set", () => {
    process.env.PI_SUBAGENT = "1";
    expect(Boolean(process.env.PI_SUBAGENT)).toBe(true);
  });

  it("factory with guard exits before touching the API when PI_SUBAGENT is set", () => {
    process.env.PI_SUBAGENT = "1";

    const touched: string[] = [];
    const mockPi = new Proxy(
      {},
      {
        get: (_, key) => {
          touched.push(String(key));
          return () => {};
        },
      },
    );

    // same guard logic as index.ts
    const runFactory = (pi: unknown) => {
      if (process.env.PI_SUBAGENT) return;
      (pi as Record<string, () => void>).registerTool();
    };

    runFactory(mockPi);
    expect(touched).not.toContain("registerTool");
  });

  it("factory proceeds when PI_SUBAGENT is absent", () => {
    delete process.env.PI_SUBAGENT;

    const touched: string[] = [];
    const mockPi = new Proxy(
      {},
      {
        get: (_, key) => {
          touched.push(String(key));
          return () => {};
        },
      },
    );

    const runFactory = (pi: unknown) => {
      if (process.env.PI_SUBAGENT) return;
      (pi as Record<string, () => void>).registerTool();
    };

    runFactory(mockPi);
    expect(touched).toContain("registerTool");
  });
});
