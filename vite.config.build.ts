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
		// 开启库模式
		lib: {
			// 绝对路径指向你的插件入口，而不是文档
			entry: resolve(__dirname, "src/index.ts"),
			name: "MyVitePressPlugin",
			fileName: format => `index.${format}.js`,
			formats: ["es", "cjs"], // 提供 ESM 和 CommonJS 两种格式
		},
		rolldownOptions: {
			// 🌟 极端重要：必须把 vitepress 和 vue 外部化，不要打包进你的插件里
			external: ["vue", "vitepress"],
			output: {
				globals: {
					vue: "Vue",
					vitepress: "VitePress",
				},
			},
		},
	},
});
