import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleGetPreset, handleSave } from "./scripts/server";

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
					let body = "";
					req.on("data", (c) => (body += c));
					req.on("end", () => {
						const result = handleSave(body ? JSON.parse(body) : undefined);
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
