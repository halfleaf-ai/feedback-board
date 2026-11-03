import { describe, expect, it } from "vitest";
import { openDatabase } from "./db.ts";
import { FeedbackStore, normalizeTags, ValidationError } from "./feedback.ts";

const fixedNow = new Date("2026-10-14T10:00:00Z");
const newStore = () => new FeedbackStore(openDatabase(":memory:"), () => fixedNow);

describe("FeedbackStore", () => {
  it("creates feedback with defaults", () => {
    const item = newStore().create({ title: "  Dark mode ", customer: "Solo Studio", tags: ["ui"] });
    expect(item).toMatchObject({ title: "Dark mode", state: "new", owner: null, votes: 1, customerTier: "free", tags: ["ui"] });
  });

  it("requires a title and a customer", () => {
    const store = newStore();
    expect(() => store.create({ title: " ", customer: "x" })).toThrow(ValidationError);
    expect(() => store.create({ title: "x", customer: "" })).toThrow(ValidationError);
  });

  it("updates state, owner and tags", () => {
    const store = newStore();
    const item = store.create({ title: "SSO", customer: "Orchard Health", tags: ["security"] });
    const updated = store.update(item.id, { state: "planned", owner: " dev ", tags: ["security", "auth"] });
    expect(updated).toMatchObject({ state: "planned", owner: "dev", tags: ["auth", "security"] });
  });

  it("clears the owner with an empty string", () => {
    const store = newStore();
    const item = store.create({ title: "SSO", customer: "Orchard Health" });
    store.update(item.id, { owner: "dev" });
    expect(store.update(item.id, { owner: "" })?.owner).toBeNull();
  });

  it("rejects negative votes", () => {
    const store = newStore();
    const item = store.create({ title: "SSO", customer: "Orchard Health" });
    expect(() => store.update(item.id, { votes: -1 })).toThrow(ValidationError);
  });

  it("filters by state", () => {
    const store = newStore();
    const planned = store.create({ title: "SSO", customer: "Orchard Health" });
    store.create({ title: "Dark mode", customer: "Solo Studio" });
    store.update(planned.id, { state: "planned" });
    expect(store.list({ state: "planned" }).total).toBe(1);
  });

  it("counts tags", () => {
    const store = newStore();
    store.create({ title: "a", customer: "c", tags: ["ui", "billing"] });
    store.create({ title: "b", customer: "c", tags: ["ui"] });
    expect(store.tags()).toEqual([
      { tag: "ui", count: 2 },
      { tag: "billing", count: 1 },
    ]);
  });
});

describe("normalizeTags", () => {
  it("trims and drops empty and duplicate tags", () => {
    expect(normalizeTags([" ui", "ui ", "", "export"])).toEqual(["ui", "export"]);
  });
});
