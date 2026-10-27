import { defineConfig } from "astro/config";

// In development the server (apps/server) runs on port 3000 and draws every icon and zip;
// the Astro dev server passes those requests on to it.
const server = `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  site: "https://mascots.opesimansion.com",
  vite: {
    server: {
      proxy: Object.fromEntries(["/api", "/icons", "/favicon.ico", "/favicon.svg", "/apple-touch-icon.png", "/healthz"].map((path) => [path, server])),
    },
  },
});
