import { Hono } from "hono";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "webui-xl",
    environment: c.env.ENVIRONMENT ?? "unknown",
  }),
);

app.get("/", (c) =>
  c.html(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WebUI-XL</title></head>` +
      `<body style="font-family:system-ui,sans-serif;padding:2rem">` +
      `<h1>WebUI-XL Worker</h1><p>Phase 2 scaffold — SSR routes coming in PR-10+.</p>` +
      `<p><a href="/health">/health</a></p></body></html>`,
  ),
);

export default app;