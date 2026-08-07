import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleGetPreset, handleSave } from "./scripts/server";

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB cap on preset save payloads
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function presetServer(): Plugin {
	return {
		name: "shared-ui-preset-server",
		configureServer(server) {
			server.middlewares.use("/api/preset", (req, res) => {
				if (req.method === "GET") {
					const result = handleGetPreset();
					res.setHeader("content-type", "application/json");
					res.end(JSON.stringify(result));
					return;
				}
				if (req.method === "POST") {
					// origin guard — the save endpoint writes files onto disk, so it is only
					// ever reachable from the loopback editor (never a remote origin).
					const origin = req.headers.origin;
					if (origin && !LOOPBACK_ORIGIN.test(origin)) {
						res.statusCode = 403;
						res.end();
						return;
					}
					let body = "";
					let tooLarge = false;
					req.on("data", (c) => {
						if (tooLarge) return;
						body += c;
						if (body.length > MAX_BODY_BYTES) {
							tooLarge = true;
							res.statusCode = 413;
							res.setHeader("content-type", "application/json");
							res.end(JSON.stringify({ ok: false, error: "payload too large" }));
							req.destroy();
						}
					});
					req.on("end", () => {
						if (tooLarge) return;
						let parsed: unknown;
						try {
							parsed = body ? JSON.parse(body) : undefined;
						} catch {
							res.statusCode = 400;
							res.setHeader("content-type", "application/json");
							res.end(JSON.stringify({ ok: false, error: "invalid json" }));
							return;
						}
						const result = handleSave(parsed);
						res.setHeader("content-type", "application/json");
						res.end(JSON.stringify(result));
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
	root: "src/preset",
	plugins: [react(), tailwindcss(), presetServer()],
	server: { port: 6100, host: false, open: true },
	build: { outDir: "../../dist-preset", emptyOutDir: true },
});
