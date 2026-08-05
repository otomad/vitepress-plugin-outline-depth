/**
 * Rename .vue.d.ts → .d.ts for all Vue component declarations in dist/.
 * vue-tsc emits Foo.vue.d.ts by default; consumers expect Foo.d.ts alongside Foo.js.
 */
import { readdirSync, renameSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(import.meta.dirname, "..", "dist");

function walk(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = resolve(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full);
		} else if (entry.name.endsWith(".vue.d.ts")) {
			renameSync(full, full.replace(/\.vue\.d\.ts$/, ".d.ts"));
		}
	}
}

walk(distDir);
