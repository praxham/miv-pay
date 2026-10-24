import { serve } from "bun";
import index from "./index.html";
import {
  docsJsonHandler,
  docsPageHandler,
  generateLinkHandler,
  ogHandler,
  verifyLinkHandler,
} from "./handlers";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/generate-link": { POST: (req) => generateLinkHandler(req) },
    "/api/verify-link": { POST: (req) => verifyLinkHandler(req) },
    "/api/og": { GET: async (req) => (await import("../api/og")).GET(req) },
    "/api/docs-json": { GET: () => docsJsonHandler() },
    "/docs": { GET: () => docsPageHandler() },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
