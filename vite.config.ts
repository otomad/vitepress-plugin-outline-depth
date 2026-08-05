import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync, renameSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const srcDir = resolve(import.meta.dirname, "src");
const distDir = resolve(import.meta.dirname, "dist");

// ── Auto-detect external dependencies from package.json ──
const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, "package.json"), "utf-8"));
const depNames = Object.keys(pkg.dependencies ?? {});
const external = [
	...depNames,
	// Sub-paths of runtime deps (e.g. smooth-value/vue)
	...depNames.map(d => new RegExp(`^${d.replace(/\//g, "\\/")}/`)),
	// VitePress plugin externals
	"vue",
	"vitepress",
	/^virtual:.*/,
];

// ── Auto-discover all .ts (except .d.ts) and .vue files under src/ ──
function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = resolve(dir, entry.name);
		if (entry.isDirectory()) {
			yield* walk(full);
			continue;
		}
		if (entry.name.endsWith(".d.ts")) continue;
		if (entry.name.endsWith(".ts") || entry.name.endsWith(".vue")) yield full;
	}
}

function getEntries(): Record<string, string> {
	const e: Record<string, string> = {};
	for (const f of walk(srcDir)) e[relative(srcDir, f).replace(/\.(ts|vue)$/, "")] = f;
	return e;
}

// ── Utility: collect all file paths under a directory ──
function collectFiles(root: string): Set<string> {
	const s = new Set<string>();
	function crawl(dir: string, prefix: string): void {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const rel = prefix + e.name;
			if (e.isDirectory()) crawl(resolve(dir, e.name), rel + "/");
			else s.add(rel);
		}
	}
	crawl(root, "");
	return s;
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		dts({
			tsconfigPath: "./tsconfig.json",
			outDirs: "dist",
			entryRoot: "src",
			processor: "vue",
			cleanVueFileName: true,
		}),
		/**
		 * Post-process Vue SFC build output in library mode: 1. Detect thin entry facades → replace with actual code
		 * chunks. 2. Update cross-file imports after chunk relocation. 3. Move auxiliary files (CSS, helpers) into
		 * components/. 4. Add CSS side-effect imports to Vue component JS. 5. Generate .d.ts for each Vue component.
		 */
		{
			name: "fix-vue-output",
			enforce: "post",
			closeBundle() {
				const read = (rel: string) => readFileSync(resolve(distDir, rel), "utf-8");
				const write = (rel: string, c: string) => writeFileSync(resolve(distDir, rel), c);
				const abs = (rel: string) => resolve(distDir, rel);

				// ── Helpers ──
				/**
				 * Fix relative import paths when a file is moved.
				 */
				function adjustImportsForMove(code: string, fromDir: string, toDir: string): string {
					const srcParts = fromDir === "." ? [] : fromDir.split("/");
					const dstParts = toDir === "." ? [] : toDir.split("/");
					const up = dstParts.length - srcParts.length;
					if (up <= 0) return code;
					const prefix = "../".repeat(up);
					return code.replace(
						/from "(\.[^"]+)"/g,
						(_m: string, p: string) => `from "${prefix}${p.slice(2)}"`,
					);
				}

				/**
				 * Patch import specifier in a JS file: oldRef → newRef.
				 */
				function patchImport(file: string, oldRel: string, newRel: string): boolean {
					if (oldRel === newRel) return false;
					const escaped = oldRel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
					// Match the import path between quotes (no \b, since " → .
					// is not a word boundary)
					const re = new RegExp(`(from ")${escaped}(")`, "g");
					const content = read(file);
					const normNew = newRel.startsWith(".") ? newRel : "./" + newRel;
					const updated = content.replace(re, `$1${normNew}$2`);
					if (updated !== content) {
						write(file, updated);
						return true;
					}
					return false;
				}

				let files = collectFiles(distDir);

				// ══════════════════════════════════════════════════════════
				// Phase 1: Detect facade→chunk pairs
				// ══════════════════════════════════════════════════════════
				type Move = { facade: string; chunk: string };
				const moves: Move[] = [];

				for (const file of files) {
					if (!file.endsWith(".js")) continue;
					const content = readFileSync(abs(file), "utf-8");
					const m = content.match(/^import .+ from "(.+)";[\r\n]+export /m);
					if (!m || content.length > 200) continue;
					const importRel = relative(distDir, resolve(dirname(abs(file)), m[1])).replace(/\\/g, "/");
					if (!files.has(importRel)) continue;
					moves.push({ facade: file, chunk: importRel });
				}

				// ══════════════════════════════════════════════════════════
				// Phase 2: Execute moves (overwrite facades)
				// ══════════════════════════════════════════════════════════
				for (const { facade, chunk } of moves) {
					let code = read(chunk);
					code = adjustImportsForMove(code, dirname(chunk), dirname(facade));
					write(facade, code);
					unlinkSync(abs(chunk));
				}

				// ══════════════════════════════════════════════════════════
				// Phase 3: Update references across all JS files
				// ══════════════════════════════════════════════════════════
				files = collectFiles(distDir);
				for (const { facade, chunk } of moves) {
					for (const file of files) {
						if (!file.endsWith(".js")) continue;
						patchImport(
							file,
							relative(dirname(abs(file)), abs(chunk)).replace(/\\/g, "/"),
							relative(dirname(abs(file)), abs(facade)).replace(/\\/g, "/"),
						);
					}
				}

				// ══════════════════════════════════════════════════════════
				// Phase 4: Move auxiliary files (CSS, helpers) → components/
				// ══════════════════════════════════════════════════════════
				files = collectFiles(distDir);
				const relocations: { from: string; to: string }[] = [];

				for (const file of files) {
					if (file.startsWith("components/")) continue;
					if (file === "index.js" || file === "types.js") continue;
					if (file.endsWith(".d.ts")) continue;
					if (file.startsWith("composables/")) continue;

					const src = abs(file);
					const to = "components/" + file.split("/").pop()!;
					const dst = abs(to);

					if (!existsSync(src)) continue;
					if (existsSync(dst)) {
						if (file.endsWith(".css")) {
							writeFileSync(dst, readFileSync(dst, "utf-8") + "\n" + readFileSync(src, "utf-8"));
						}
						unlinkSync(src);
					} else {
						renameSync(src, dst);
					}
					relocations.push({ from: file, to });
				}

				// Phase 4b: Fix imports referencing relocated files
				files = collectFiles(distDir);
				for (const { from, to } of relocations) {
					for (const file of files) {
						if (!file.endsWith(".js")) continue;
						patchImport(
							file,
							relative(dirname(abs(file)), abs(from)).replace(/\\/g, "/"),
							relative(dirname(abs(file)), abs(to)).replace(/\\/g, "/"),
						);
					}
				}

				// ══════════════════════════════════════════════════════════
				// Phase 5: Add CSS side-effect imports (CSS now in place)
				// ══════════════════════════════════════════════════════════
				files = collectFiles(distDir);

				for (const file of files) {
					if (!file.endsWith(".js")) continue;
					// Target: files in components/ with PascalCase names
					if (!/^components\/[A-Z]/.test(file)) continue;

					const baseName = file.split("/").pop()!.replace(/\.js$/, "");
					const fileDir = dirname(file);

					for (const cssFile of files) {
						if (!cssFile.endsWith(".css")) continue;
						if (dirname(cssFile) !== fileDir) continue;
						if (!cssFile.split("/").pop()!.startsWith(baseName)) continue;

						const cssImport = `import "./${cssFile.split("/").pop()}";\n`;
						let content = read(file);
						if (!content.includes(cssImport)) {
							content = cssImport + content;
							write(file, content);
						}
					}
				}

				// ══════════════════════════════════════════════════════════
				// Phase 6: Generate .d.ts stubs for Vue components
				// ══════════════════════════════════════════════════════════
				for (const file of files) {
					if (!file.endsWith(".js")) continue;
					if (!/^components\/[A-Z]/.test(file)) continue;

					const dtsFile = file.replace(/\.js$/, ".d.ts");
					if (files.has(dtsFile)) continue; // already exists from tsc

					const dtsContent = [
						"import type { DefineComponent } from 'vue';",
						"declare const _default: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;",
						"export default _default;",
						"",
					].join("\n");
					writeFileSync(abs(dtsFile), dtsContent);
				}
			},
		},
	],
	build: {
		lib: {
			entry: getEntries(),
			formats: ["es"],
		},
		emptyOutDir: false,
		minify: false,
		cssCodeSplit: true,
		rollupOptions: {
			output: {
				entryFileNames: "[name].js",
				chunkFileNames: "[name].js",
				assetFileNames: "[name].[ext]",
			},
			treeshake: false,
			external,
		},
	},
});
