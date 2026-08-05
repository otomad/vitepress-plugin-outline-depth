import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	build: {
		lib: {
			entry: "src",
			formats: ["es"],
		},
		emptyOutDir: false,
		minify: false,
		rolldownOptions: {
			treeshake: false,
			preserveEntrySignatures: "strict",
		},
	},
});
