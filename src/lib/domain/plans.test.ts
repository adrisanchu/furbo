import { describe, expect, it } from "vitest";
import { checkGroupQuota, checkVisibilityChange } from "./plans";

describe("group quota", () => {
  it("lets free users own up to 2 public groups", () => {
    expect(checkGroupQuota("free", { public: 0, private: 0 }, "public")).toEqual({ ok: true });
    expect(checkGroupQuota("free", { public: 1, private: 0 }, "public")).toEqual({ ok: true });
    expect(checkGroupQuota("free", { public: 2, private: 0 }, "public")).toEqual({ ok: false, reason: "limit-reached" });
  });

  it("keeps private groups for premium", () => {
    expect(checkGroupQuota("free", { public: 0, private: 0 }, "private")).toEqual({
      ok: false,
      reason: "private-needs-premium",
    });
    expect(checkGroupQuota("premium", { public: 3, private: 2 }, "private")).toEqual({ ok: true });
  });

  it("caps premium at 10 groups of any kind", () => {
    expect(checkGroupQuota("premium", { public: 6, private: 3 }, "public")).toEqual({ ok: true });
    expect(checkGroupQuota("premium", { public: 6, private: 4 }, "public")).toEqual({ ok: false, reason: "limit-reached" });
  });

  it("gates switching a group to private", () => {
    expect(checkVisibilityChange("free", "public", "private")).toEqual({ ok: false, reason: "private-needs-premium" });
    expect(checkVisibilityChange("free", "private", "public")).toEqual({ ok: true });
    expect(checkVisibilityChange("premium", "public", "private")).toEqual({ ok: true });
  });
});
