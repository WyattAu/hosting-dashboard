// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import solid from "@astrojs/solid-js";

// Deployment target: docker01 (the tenant Docker host). The dashboard is a
// small node service next to hosting-api; the edge proxy terminates TLS and
// enforces user auth (oauth2-proxy) in front of it. Server output because
// /api/* routes proxy to hosting-api with the bearer token kept server-side.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [solid()],
  server: {
    host: "127.0.0.1",
    port: 4321,
  },
});
