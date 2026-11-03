import { describe, expect, it } from "vitest";
import { openDatabase } from "./db.ts";
import { buildDigest, weekStartFor } from "./digest.ts";
import { FeedbackStore } from "./feedback.ts";

describe("weekStartFor", () => {
  it("returns the Monday of the week", () => {
    const start = weekStartFor(new Date(2026, 9, 14, 15)); // Wednesday
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getDay()]).toEqual([2026, 9, 12, 1]);
  });
});

describe("buildDigest", () => {
  it("summarizes the week's feedback", () => {
    const store = new FeedbackStore(openDatabase(":memory:"), () => new Date(2026, 9, 16));
    store.create({ title: "Export to CSV", customer: "Brightwave", customerTier: "enterprise", tags: ["export"], createdAt: new Date(2026, 9, 13).toISOString() });
    store.create({ title: "Dark mode", customer: "Solo Studio", tags: ["ui"], createdAt: new Date(2026, 9, 14).toISOString() });
    store.create({ title: "Last week", customer: "Pinecrest", createdAt: new Date(2026, 9, 8).toISOString() });

    const digest = buildDigest(store, new Date(2026, 9, 14));

    expect(digest.received).toBe(2);
    expect(digest.byState.new).toBe(2);
    expect(digest.unassigned).toBe(2);
    expect(digest.topRequests[0].title).toBe("Export to CSV");
    expect(digest.topTags.map((tag) => tag.tag)).toEqual(["export", "ui"]);
  });
});
