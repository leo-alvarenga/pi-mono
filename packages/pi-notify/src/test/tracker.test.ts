import { describe, it, expect } from "vitest";
import { RunTracker } from "../tracker";
import type { Notifier } from "../notifier";

function fakeNotifier(): { calls: string[][]; notifier: Notifier } {
  const calls: string[][] = [];
  return {
    calls,
    notifier: { notify: (s, b) => calls.push([s, b]) },
  };
}

describe("RunTracker", () => {
  it("disabled tracker fires no notification", () => {
    const { calls, notifier } = fakeNotifier();
    const t = new RunTracker(
      () => false,
      notifier,
      () => "/tmp/proj",
    );
    t.begin();
    t.settle("abc123");
    expect(calls).toHaveLength(0);
  });

  it("enabled tracker fires exactly one notification on settle", () => {
    const { calls, notifier } = fakeNotifier();
    const t = new RunTracker(
      () => true,
      notifier,
      () => "/tmp/myrepo",
    );
    t.begin();
    t.settle("3f9c2a81");
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("Pi 3f9c2a81 done");
    expect(calls[0][1]).toMatch(/Finished in .* · myrepo/);
  });

  it("notification title includes session label", () => {
    const { calls, notifier } = fakeNotifier();
    const t = new RunTracker(
      () => true,
      notifier,
      () => "/tmp/work",
    );
    t.begin();
    t.settle("session-label");
    expect(calls[0][0]).toContain("session-label");
  });

  it("notification body matches cwd basename", () => {
    const { calls, notifier } = fakeNotifier();
    const t = new RunTracker(
      () => true,
      notifier,
      () => "/home/user/my-project",
    );
    t.begin();
    t.settle("x");
    expect(calls[0][1]).toContain("my-project");
  });

  it("settle without begin is silent", () => {
    const { calls, notifier } = fakeNotifier();
    const t = new RunTracker(
      () => true,
      notifier,
      () => "/tmp/proj",
    );
    t.settle("abc");
    expect(calls).toHaveLength(0);
  });

  it("double settle fires exactly once", () => {
    const { calls, notifier } = fakeNotifier();
    const t = new RunTracker(
      () => true,
      notifier,
      () => "/tmp/proj",
    );
    t.begin();
    t.settle("abc");
    t.settle("abc");
    expect(calls).toHaveLength(1);
  });
});
