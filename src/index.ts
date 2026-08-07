import type { PluginOption } from "vite";
import type { SiteConfig, UserConfig, DefaultTheme } from "vitepress";
import { clamp } from "./composables/math.js";
import type { OutlineDepthPluginOptions, AvailableDepthValue } from "./types.js";

const componentName = "OutlineDepthToggle";
const componentFile = `${componentName}.vue`;
const aliasComponentFile = `${import.meta.dirname}/components/${componentFile}`;

const pluginName = "vitepress-plugin-outline-depth";
const virtualModuleId = `virtual:${pluginName}/plugin-options`;
const resolvedVirtualModuleId = `\0${virtualModuleId}`;
const aliasComponentId = `${pluginName}/${componentFile}`;

const slots = ["aside-outline-before"];

export default function outlineDepthPlugin(options: OutlineDepthPluginOptions = {}): PluginOption {
	options.defaultDepth ??= 2;
	options.defaultAutoExpand ??= true;
	options.minDepth ??= 2;
	options.maxDepth ??= 6;
	options.locales ??= {};
	options.saveToLocalStorage ??= true;
	options.stickAtTop ??= true;
	options.scrollActiveOutlineLinkIntoView ??= true;
	options.setConfigOutlineLevelToDeep ??= true;
	if (options.maxDepth <= options.minDepth)
		throw new RangeError(`\`${pluginName}\` Options Error
\`maxDepth\` cannot less than or equal to \`minDepth\`.

Current values:
- \`minDepth\`: ${options.minDepth}
- \`maxDepth\`: ${options.maxDepth}`);
	options.defaultDepth = clamp(options.defaultDepth, options.minDepth, options.maxDepth) as AvailableDepthValue;

	let resolvedConfig: unknown;

	return {
		name: pluginName,
		enforce: "pre",
		config: () => {
			return {
				resolve: {
					alias: {
						[aliasComponentId]: aliasComponentFile,
					},
				},
			};
		},
		async configResolved(_config) {
			const config = _config as typeof _config & { vitepress: SiteConfig<DefaultTheme.Config> };
			if (resolvedConfig || !options.setConfigOutlineLevelToDeep) return;
			resolvedConfig = config;
			const userConfig = config.vitepress.userConfig as UserConfig<DefaultTheme.Config>;

			function setOutlineLevelToDeep(config: { themeConfig?: DefaultTheme.Config }) {
				config.themeConfig ??= {};
				const outlineConfig = config.themeConfig.outline;
				if (outlineConfig && typeof outlineConfig === "object" && !Array.isArray(outlineConfig))
					outlineConfig.level = "deep";
				else config.themeConfig.outline = { level: "deep" };
			}

			setOutlineLevelToDeep(userConfig);
			if (userConfig.locales)
				for (const localeConfig of Object.values(userConfig.locales)) setOutlineLevelToDeep(localeConfig);
		},
		transform(code, id) {
			// Inject into standard VitePress Default Theme Layout.
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
					`${setupPosition}\nimport ${componentName} from '${aliasComponentId}'`,
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
