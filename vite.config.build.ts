import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
	plugins: [
		// 必须要引入 vue 插件来编译你插件内的 .vue 文件
		vue(),
		// 自动为你的 TS 和 .vue 组件生成类型定义文件
		dts({
			cleanVueFileName: true,
			include: ["src/**/*.ts", "src/**/*.vue"],
		}),
	],
	build: {
		// 关键：指定打包产物输出目录，避免覆盖 vitepress 的 dist
		outDir: "dist",
		// 1. 禁用代码压缩，保持可读性
		minify: false,
		// 2. 必须关闭 cssCodeSplit，否则多模块模式下样式可能无法正确提取
		cssCodeSplit: false,
		// 开启库模式
		lib: {
			// 绝对路径指向你的插件入口，而不是文档
			entry: resolve(__dirname, "src/index.ts"),
			formats: ["es"], // 提供 ESM 和 CommonJS 两种格式
		},
		rolldownOptions: {
			// 3. 极端重要：必须把所有 node 模块、vue 和 vitepress 设为外部依赖
			external: id =>
				id.includes("node_modules") ||
				id.startsWith("node:") ||
				["vue", "vitepress", "fs", "path"].includes(id),
			output: {
				preserveModules: true, // 🌟 保持原有的目录结构
				preserveModulesRoot: "src", // 🌟 以 src 目录作为根结构
				entryFileNames: "[name].js", // 🌟 保持原文件名，.vue 也会变成 .vue.js 或 .js
				assetFileNames: "[name].[ext]",
			},
		},
	},
});
