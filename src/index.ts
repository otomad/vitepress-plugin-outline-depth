import type { PluginOption } from "vite";
import type { OutlineDepthPluginOptions } from "./types.js";

const componentName = "OutlineDepthToggle";
const componentFile = `${componentName}.vue`;
const aliasComponentFile = `${import.meta.dirname}/components/${componentFile}`;

const virtualModuleId = "virtual:outline-depth-plugin-options";
const resolvedVirtualModuleId = `\0${virtualModuleId}`;

const slots = ["aside-outline-before"];

export function outlineDepthPlugin(options?: OutlineDepthPluginOptions): PluginOption {
	return {
		name: "vitepress-plugin-outline-depth",
		enforce: "pre",
		config: () => {
			return {
				resolve: {
					alias: {
						[`./${componentFile}`]: aliasComponentFile,
					},
				},
			};
		},
		transform(code, id) {
			// Inject into standard VitePress Default Theme Layout
			if (id.endsWith("vitepress/dist/client/theme-default/Layout.vue")) {
				let transformResult = code;

				for (const element of slots) {
					const slotPosition = `<slot name="${element}" />`;
					// Append component after the slot
					transformResult = transformResult.replace(slotPosition, `${slotPosition}<${componentName} />`);
				}

				const setupPosition = '<script setup lang="ts">';
				transformResult = transformResult.replace(
					setupPosition,
					`${setupPosition}\nimport ${componentName} from './${componentName}.vue'`,
				);
				return transformResult;
			}
		},
		resolveId(id: string) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId;
			}
		},
		load(this, id) {
			if (id === resolvedVirtualModuleId) {
				return `export default ${JSON.stringify(options)}`;
			}
		},
	};
}
