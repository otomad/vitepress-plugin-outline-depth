/**
 * Build script: compiles src/*.ts and src/*.vue to dist/.
 *
 *   .ts  → esbuild strips types → .js
 *   .vue → @vue/compiler-sfc compiles SFC → .js (via esbuild) + .css
 *
 * .d.ts files are generated separately by vue-tsc (see package.json scripts).
 */

import { parse, compileScript, compileStyle } from "vue/compiler-sfc";
import { transform } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, relative, dirname, basename } from "node:path";
import { createHash } from "node:crypto";

const srcDir = resolve(import.meta.dirname, "..", "src");
const distDir = resolve(import.meta.dirname, "..", "dist");

/** Walk src/ recursively, yielding absolute paths. */
function* walk(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = resolve(dir, entry.name);
		if (entry.isDirectory()) {
			yield* walk(full);
			continue;
		}
		yield full;
	}
}

/**
 * Generate a stable hash for CSS scoping based on the relative file path.
 * Mirrors Vite's approach: `data-v-${hash(filepath)}`.
 */
function hashPath(filepath) {
	return createHash("sha256").update(filepath).digest("hex").slice(0, 8);
}

async function buildFile(file) {
	const relPath = relative(srcDir, file);
	const outDir = resolve(distDir, dirname(relPath));
	mkdirSync(outDir, { recursive: true });

	// Skip ambient declaration files
	if (basename(file).endsWith(".d.ts")) return;

	// ── .ts files: just strip types ──
	if (file.endsWith(".ts")) {
		const code = readFileSync(file, "utf-8");
		const result = await transform(code, {
			loader: "ts",
			format: "esm",
			target: "esnext",
		});
		writeFileSync(resolve(distDir, relPath.replace(/\.ts$/, ".js")), result.code);
		return;
	}

	// ── .vue files: SFC compilation ──
	if (file.endsWith(".vue")) {
		const src = readFileSync(file, "utf-8");
		const scopeId = "data-v-" + hashPath(relPath);
		const { descriptor } = parse(src, { filename: file });

		// Compile script (handles <script> + <script setup>, inlines template)
		const compiledScript = compileScript(descriptor, {
			id: scopeId,
			inlineTemplate: true,
			hoistStatic: true,
			isProd: true,
		});

		// Strip TypeScript types from compiled script via esbuild
		let jsCode = compiledScript.content;
		const esbuildResult = await transform(jsCode, {
			loader: "ts",
			format: "esm",
			target: "esnext",
		});
		jsCode = esbuildResult.code;

		// Rewrite .vue → .js in import specifiers so imports resolve in dist/
		jsCode = jsCode.replace(
			/from\s+"([^"]+)\.vue"/g,
			'from "$1.js"',
		);

		// Add __scopeId for scoped styles (insert after __name)
		if (descriptor.styles.some((s) => s.scoped)) {
			jsCode = jsCode.replace(
				/(__name:\s*'[^']*',)/,
				`$1\n  __scopeId: "${scopeId}",`,
			);
		}

		// Add CSS side-effect import if styles exist
		const cssBase = basename(file).replace(/\.vue$/, ".css");
		const hasStyles = descriptor.styles.length > 0;
		if (hasStyles) {
			jsCode = `import "./${cssBase}";\n` + jsCode;
		}

		// Write JS
		writeFileSync(resolve(distDir, relPath.replace(/\.vue$/, ".js")), jsCode);

		// Compile and write CSS
		if (hasStyles) {
			let allCss = "";
			for (const style of descriptor.styles) {
				const compiled = compileStyle({
					source: style.content,
					filename: file,
					id: scopeId,
					scoped: style.scoped ?? false,
					isProd: true,
				});
				allCss += compiled.code + "\n";
			}
			writeFileSync(resolve(distDir, relPath.replace(/\.vue$/, ".css")), allCss);
		}
	}
}

async function main() {
	for (const file of walk(srcDir)) {
		await buildFile(file);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
