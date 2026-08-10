import { relative, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { codemodCssTs } from "./src/engine/codemod";

/** Monorepo root — `packages/preset-engine` is two levels down. */
const repoRoot = resolve(__dirname, "../..");
const sharedUiRoot = resolve(repoRoot, "packages/shared-ui");
const sharedUiStyles = resolve(sharedUiRoot, "src/styles");
const sharedUiComponents = resolve(sharedUiRoot, "src/components");

/**
 * Run the codemod over every *.css.ts under shared-ui components.
 * Globbed (not a fixed list) so newly added components are picked up
 * automatically. Only files whose content actually changes are written,
 * which keeps the operation idempotent and leaves mtimes alone otherwise.
 * Returns the repo-relative paths of the files that were rewritten.
 */
async function runCodemod(): Promise<string[]> {
  const { globSync, readFileSync, writeFileSync } = await import("node:fs");
  const files = globSync("**/*.css.ts", { cwd: sharedUiComponents });
  const modified: string[] = [];

  for (const file of files.sort()) {
    const absolute = resolve(sharedUiComponents, file);
    const before = readFileSync(absolute, "utf8");
    const after = codemodCssTs(before);
    if (after === before) continue;
    writeFileSync(absolute, after, "utf8");
    modified.push(relative(repoRoot, absolute));
  }

  return modified;
}

function presetServer(): Plugin {
  return {
    name: "preset-engine-server",
    configureServer(server) {
      // API: read current CSS files
      server.middlewares.use("/api/tokens", async (req, res) => {
        if (req.method === "GET") {
          try {
            const { readFileSync } = await import("node:fs");
            const colors = readFileSync(
              resolve(sharedUiStyles, "colors.css"),
              "utf8",
            );
            const global = readFileSync(
              resolve(sharedUiStyles, "global.css"),
              "utf8",
            );
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true, colors, global }));
          } catch (e) {
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
          return;
        }
        res.statusCode = 405;
        res.end();
      });

      // API: save CSS files + run the component codemod
      server.middlewares.use("/api/save", async (req, res) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (c) => (body += c));
          req.on("end", async () => {
            try {
              const { colors, global } = JSON.parse(body);
              if (typeof colors !== "string" || typeof global !== "string") {
                throw new Error(
                  "invalid payload: `colors` and `global` must be strings",
                );
              }
              const { writeFileSync } = await import("node:fs");
              writeFileSync(
                resolve(sharedUiStyles, "colors.css"),
                colors,
                "utf8",
              );
              writeFileSync(
                resolve(sharedUiStyles, "global.css"),
                global,
                "utf8",
              );
              const modified = await runCodemod();
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ ok: true, modified }));
            } catch (e) {
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ ok: false, error: String(e) }));
            }
          });
          return;
        }
        res.statusCode = 405;
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), presetServer()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: { port: 6100, host: false, open: true },
});
