declare module "virtual:outline-depth-plugin-options" {
	const OutlineDepthPluginOptions: import("./types.ts").OutlineDepthPluginOptions;
	export default OutlineDepthPluginOptions;
}

// ESNext
declare interface ScrollIntoViewOptions {
	container?: "all" | "nearest";
}
