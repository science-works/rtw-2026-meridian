import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
  // `npm run demo:serve`: the built app, no hot reload (WEB_PORT / MERIDIAN_API_URL override the defaults).
  preview: {
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
    proxy: { "/api": process.env.MERIDIAN_API_URL ?? "http://localhost:8787" },
  },
});
