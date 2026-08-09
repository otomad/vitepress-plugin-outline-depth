// This is NOT the actual app's Vite configuration.
// This file is a required for Storybook to run.

import { resolve } from "node:path";
import vue from "@vitejs/plugin-vue";

const config = {
	plugins: [vue()],
	resolve: {
		alias: {
			"virtual:vitepress-plugin-outline-depth/plugin-options": resolve(
				import.meta.dirname,
				"./_virtual_plugin-options-example.ts",
			),
		},
	},
};

export default config;
