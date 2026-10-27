// Starts the server. Settings come from the environment; see the README for each one.
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApp } from "./app.mjs";

const env = process.env;
const number = (name, fallback) => {
  const value = Number(env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a whole number above 0.`);
  return value;
};

const app = createApp({
  staticDir: env.MASCOTS_STATIC_DIR ?? fileURLToPath(new URL("../../web/dist/", import.meta.url)),
  makerPerMinute: number("MASCOTS_MAKER_RATE_PER_MINUTE", 6),
  maxConcurrent: number("MASCOTS_MAX_CONCURRENT", 2),
  maxQueue: number("MASCOTS_MAX_QUEUE", 20),
  trustProxy: env.MASCOTS_TRUST_PROXY === "1",
});

const port = number("PORT", 3000);
const server = serve({ fetch: app.fetch, port, hostname: env.HOST ?? "0.0.0.0" }, ({ address, port }) => {
  console.log(`Mascots on http://${address}:${port}`);
});

// Let in-flight downloads finish when Docker stops the container.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
