/**
 * Regenerate src/lib/ai/schema.d.ts from the backend's OpenAPI schema.
 *
 *   npm run api:types                         # from a local backend on :8010
 *   API_SCHEMA=path/or/url npm run api:types  # from a file or another server
 *
 * Commit the result: the types are part of the contract, and a diff in them
 * is the clearest review of an API change.
 */
import { execFileSync } from "node:child_process";

const source = process.env.API_SCHEMA || "http://localhost:8010/api/schema/";
execFileSync("npx", ["openapi-typescript", source, "-o", "src/lib/ai/schema.d.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
