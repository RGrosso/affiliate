// Starts the dev server for the Playwright tests with an empty database, so every run starts from
// first-run setup: an admin with no password, then sample products on the first admin login.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { E2E_PORT } from "./config.ts";

rmSync(".data-e2e", { recursive: true, force: true });

// Run Nuxt's CLI with node directly rather than through pnpm and a shell, so stopping this process
// stops the dev server too instead of leaving it holding the port
const server = spawn(process.execPath, ["node_modules/nuxt/bin/nuxt.mjs", "dev", "--envName", "e2e", "--port", String(E2E_PORT), "--no-fork"], {
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", code => process.exit(code ?? 0));
