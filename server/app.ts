import { Hono } from "hono";
import { buildDigest, digestMarkdown } from "./digest.ts";
import { FeedbackStore, STATES, TIERS, ValidationError, type State, type Tier } from "./feedback.ts";

export function createApp(store: FeedbackStore) {
  const app = new Hono().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
    console.error(err);
    return c.json({ error: "internal error" }, 500);
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/feedback", (c) => {
    const state = c.req.query("state");
    if (state && !STATES.includes(state as State)) throw new ValidationError(`unknown state: ${state}`);
    return c.json(
      store.list({
        state: state as State | undefined,
        tag: c.req.query("tag"),
        owner: c.req.query("owner"),
        page: optionalInt(c.req.query("page")),
        pageSize: optionalInt(c.req.query("pageSize")),
      }),
    );
  });

  app.post("/feedback", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const tier = body.customerTier as Tier | undefined;
    if (tier && !TIERS.includes(tier)) throw new ValidationError(`unknown tier: ${tier}`);
    const created = store.create({
      title: String(body.title ?? ""),
      body: typeof body.body === "string" ? body.body : undefined,
      customer: String(body.customer ?? ""),
      customerTier: tier,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    });
    return c.json(created, 201);
  });

  app.get("/feedback/:id", (c) => {
    const item = store.get(Number(c.req.param("id")));
    return item ? c.json(item) : c.json({ error: "not found" }, 404);
  });

  app.patch("/feedback/:id", async (c) => {
    const item = store.update(Number(c.req.param("id")), await c.req.json());
    return item ? c.json(item) : c.json({ error: "not found" }, 404);
  });

  app.delete("/feedback/:id", (c) =>
    store.remove(Number(c.req.param("id"))) ? c.body(null, 204) : c.json({ error: "not found" }, 404),
  );

  app.get("/tags", (c) => c.json(store.tags()));

  app.get("/digests/:weekStart", (c) => {
    const day = new Date(`${c.req.param("weekStart")}T12:00:00`);
    if (Number.isNaN(day.getTime())) throw new ValidationError("weekStart must be YYYY-MM-DD");
    const digest = buildDigest(store, day);
    return c.req.query("format") === "markdown" ? c.text(digestMarkdown(digest)) : c.json(digest);
  });

  return app;
}

function optionalInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) throw new ValidationError(`not a number: ${value}`);
  return parsed;
}
