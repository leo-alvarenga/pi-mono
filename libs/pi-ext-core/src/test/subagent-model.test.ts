import { describe, expect, it } from "vitest";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import { defaultResolveModel, isUsableModelRef } from "../subagents/model";

const model = { provider: "deepseek", id: "deepseek-flash" };

const makeCtx = (over: Record<string, unknown> = {}) =>
  ({
    model,
    thinkingLevel: "high",
    modelRegistry: {
      find: (p: string, id: string) =>
        p === model.provider && id === model.id ? model : undefined,
      hasConfiguredAuth: () => true,
    },
    ...over,
  }) as unknown as ExtensionContext;

describe("defaultResolveModel", () => {
  it("inherits provider/id and thinking from the orchestrator", () => {
    expect(defaultResolveModel(makeCtx())).toEqual({
      model: "deepseek/deepseek-flash",
      thinking: "high",
    });
  });

  it("returns empty when the orchestrator has no model", () => {
    expect(defaultResolveModel(makeCtx({ model: undefined }))).toEqual({});
  });
});

describe("isUsableModelRef", () => {
  it("accepts a known model with auth", () => {
    expect(isUsableModelRef(makeCtx(), "deepseek/deepseek-flash")).toBe(true);
  });

  it("rejects undefined, bare ids and unknown models", () => {
    expect(isUsableModelRef(makeCtx(), undefined)).toBe(false);
    expect(isUsableModelRef(makeCtx(), "deepseek-flash")).toBe(false);
    expect(isUsableModelRef(makeCtx(), "deepseek/nope")).toBe(false);
  });

  it("rejects a model without configured auth", () => {
    const ctx = makeCtx({
      modelRegistry: { find: () => model, hasConfiguredAuth: () => false },
    });
    expect(isUsableModelRef(ctx, "deepseek/deepseek-flash")).toBe(false);
  });
});
