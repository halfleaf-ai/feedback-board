import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { createApp } from "./app.ts";
import { openDatabase } from "./db.ts";
import { FeedbackStore } from "./feedback.ts";

const port = Number(process.env.PORT ?? 8787);
const app = new Hono().route("/", createApp(new FeedbackStore(openDatabase())));

if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("/*", serveStatic({ path: "./dist/index.html" }));
}

serve({ fetch: app.fetch, port }, () => {
  console.log(`Feedback Board listening on http://localhost:${port}`);
});
