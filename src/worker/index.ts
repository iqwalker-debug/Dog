import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppBindings } from "./env";
import config from "./routes/config";
import sermons from "./routes/sermons";
import events from "./routes/events";

const app = new Hono<AppBindings>();

app.use("/api/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

app.get("/api/health", (c) => c.json({ data: { ok: true }, error: null }));

app.route("/api/config", config);
app.route("/api/sermons", sermons);
app.route("/api/events", events);

// /api/give/* — Phase 1.5, intentionally stubbed.
app.all("/api/give/*", (c) =>
  c.json(
    { data: null, error: { code: "not_implemented", message: "Stripe integration coming in Phase 1.5." } },
    501,
  ),
);

app.notFound((c) =>
  c.req.path.startsWith("/api/")
    ? c.json({ data: null, error: { code: "not_found", message: "Route not found." } }, 404)
    : c.env.ASSETS.fetch(c.req.raw),
);

app.onError((err, c) => {
  console.error("worker error", err);
  return c.json(
    { data: null, error: { code: "internal", message: "Unexpected server error." } },
    500,
  );
});

export default app;
