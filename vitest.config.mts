import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // @vitejs/plugin-react is typed against the top-level Vite 8, while vitest 3.x
  // bundles its own Vite 7; the two Plugin types differ only in internal
  // rolldown/rollup hook signatures, so the array is retyped as vitest's own
  // Plugin to shed that skew. At runtime vitest loads the plugin under its own
  // Vite and the suite is green — this is a types-only cross-package artifact.
  plugins: [react()] as unknown as Plugin[],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Playwright owns e2e; vitest owns units. Without this vitest tries to run
    // the Playwright specs and fails on a missing test runner.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
