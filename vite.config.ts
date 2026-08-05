import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { resolve, relative, extname, dirname } from "node:path";
import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, "src");

/**
 * Recursively walk a directory, yielding all .ts (excluding .d.ts) and .vue files.
 */
function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const fullPath = resolve(dir, entry.name);
		if (entry.isDirectory()) {
			yield* walk(fullPath);
		} else if (entry.isFile()) {
			const ext = extname(entry.name);
			// Skip ambient declaration files
			if (ext === ".ts" && entry.name.endsWith(".d.ts")) continue;
			if (ext === ".ts" || ext === ".vue") {
				yield fullPath;
			}
		}
	}
}

/**
 * Build a Rollup-compatible entries object, mapping output paths to source files.
 */
function getEntries(srcDir: string): Record<string, string> {
	const entries: Record<string, string> = {};
	for (const file of walk(srcDir)) {
		const name = relative(srcDir, file).replace(/\.(ts|vue)$/, "");
		entries[name] = file;
	}
	return entries;
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		dts({
			tsconfigPath: "./tsconfig.json",
			outDirs: "dist",
			entryRoot: "src",
			// Let the plugin use tsconfig defaults for include/exclude.
			// copyDtsFiles defaults to false, so src/*.d.ts won't be copied to dist.
		}),
		/**
		 * Post-process the build output to fix file locations for Vue SFC chunks.
		 *
		 * In Vite library mode with multi-entry, Vue SFCs with only <script setup>
		 * create thin entry facades in subdirectories while placing the actual
		 * component code in chunks at the dist root. CSS from Vue SFCs and the
		 * shared _plugin-vue_export-helper also end up at the dist root.
		 *
		 * This plugin moves them into the correct subdirectory and patches imports.
		 */
		{
			name: "vitepress-outline-depth:fix-chunk-locations",
			enforce: "post",
			closeBundle() {
				const distDir = resolve(__dirname, "dist");

				/**
				 * Move a file from srcRel to dstRel within dist, adjusting internal
				 * "./xxx" relative imports to account for the directory change.
				 */
				function moveAndPatch(srcRel: string, dstRel: string): void {
					const srcAbs = resolve(distDir, srcRel);
					const dstAbs = resolve(distDir, dstRel);
					if (!existsSync(srcAbs)) return;

					let content = readFileSync(srcAbs, "utf-8");

					// When moving from a shallower directory to a deeper one,
					// local "./xxx" imports need "../" prefixing.
					const srcDirName = dirname(srcRel);
					const dstDirName = dirname(dstRel);
					if (srcDirName !== dstDirName) {
						const srcParts = srcDirName === "." ? [] : srcDirName.split("/");
						const dstParts = dstDirName === "." ? [] : dstDirName.split("/");
						const upLevels = dstParts.length - srcParts.length;
						if (upLevels > 0) {
							const prefix = "../".repeat(upLevels);
							content = content.replace(
								/from "(\.[^"]+)"/g,
								(_m: string, p: string) => `from "${prefix}${p.slice(2)}"`,
							);
							content = content.replace(
								/from '(\.[^']+)'/g,
								(_m: string, p: string) => `from '${prefix}${p.slice(2)}'`,
							);
						}
					}

					writeFileSync(dstAbs, content);
					if (resolve(srcAbs) !== resolve(dstAbs)) {
						unlinkSync(srcAbs);
					}
				}

				/**
				 * Update all import references to a moved file across every .js
				 * file in dist. Ensures relative paths always start with ./ or ../
				 * to avoid bare specifiers (which resolve as node_modules packages).
				 */
				function updateReferences(oldRel: string, newRel: string): void {
					const oldAbs = resolve(distDir, oldRel);
					const newAbs = resolve(distDir, newRel);

					function walkJsFiles(dir: string): void {
						for (const entry of readdirSync(dir, { withFileTypes: true })) {
							const fullPath = resolve(dir, entry.name);
							if (entry.isDirectory()) {
								walkJsFiles(fullPath);
							} else if (entry.isFile() && entry.name.endsWith(".js")) {
								const fileDir = dirname(fullPath);
								const oldImport = relative(fileDir, oldAbs).replace(/\\/g, "/");
								let newImport = relative(fileDir, newAbs).replace(/\\/g, "/");
								if (oldImport === newImport) continue;

								// Ensure the new import is a valid relative path
								if (!newImport.startsWith(".")) {
									newImport = "./" + newImport;
								}

								const escapedOld = oldImport.replace(
									/[.*+?^${}()|[\]\\]/g,
									"\\$&",
								);
								const regex = new RegExp(
									`(from\\s")${escapedOld}(")`,
									"g",
								);

								const content = readFileSync(fullPath, "utf-8");
								const updated = content.replace(
									regex,
									`$1${newImport}$2`,
								);
								if (updated !== content) {
									writeFileSync(fullPath, updated);
								}
							}
						}
					}
					walkJsFiles(distDir);
				}

				// ── Move helper FIRST so Slider/Switch can reference it at the new location ──
				moveAndPatch(
					"_plugin-vue_export-helper.js",
					"components/_plugin-vue_export-helper.js",
				);
				updateReferences(
					"_plugin-vue_export-helper.js",
					"components/_plugin-vue_export-helper.js",
				);

				// ── Move Slider chunk (root) → components/Slider.js (overwrites facade) ──
				moveAndPatch("Slider.js", "components/Slider.js");
				updateReferences("Slider.js", "components/Slider.js");

				// ── Move Switch chunk (root) → components/Switch.js (overwrites facade) ──
				moveAndPatch("Switch.js", "components/Switch.js");
				updateReferences("Switch.js", "components/Switch.js");

				// Re-run helper reference update now that Slider/Switch are in
				// components/: their "./" → "../" rewrite during moveAndPatch may
				// have broken the import path to the helper.
				updateReferences(
					"_plugin-vue_export-helper.js",
					"components/_plugin-vue_export-helper.js",
				);

				// ── Move Vue CSS files from root into components/ ──
				for (const cssFile of ["Slider.css", "Switch.css", "OutlineDepthToggle.css"]) {
					const src = resolve(distDir, cssFile);
					const dst = resolve(distDir, "components", cssFile);
					if (existsSync(src)) {
						if (existsSync(dst)) {
							// Merge: root CSS after existing CSS
							const srcContent = readFileSync(src, "utf-8");
							const dstContent = readFileSync(dst, "utf-8");
							writeFileSync(dst, dstContent + "\n" + srcContent);
							unlinkSync(src);
						} else {
							renameSync(src, dst);
						}
					}
				}
			},
		},
	],
	build: {
		lib: {
			// Every .ts / .vue file as its own entry point (no bundling of local modules)
			entry: getEntries(srcDir),
			formats: ["es"],
		},
		emptyOutDir: false,
		minify: false,
		// Extract CSS from Vue SFCs into separate files
		cssCodeSplit: true,
		rollupOptions: {
			output: {
				// Consistent output naming — mirrors the src directory structure
				entryFileNames: "[name].js",
				chunkFileNames: "[name].js",
				assetFileNames: "[name].[ext]",
			},
			// No tree-shaking / dead-code elimination
			treeshake: false,
			external: [
				"vue",
				"vitepress",
				"smooth-value",
				"smooth-value/vue",
				/^virtual:.*/,
			],
		},
	},
});
