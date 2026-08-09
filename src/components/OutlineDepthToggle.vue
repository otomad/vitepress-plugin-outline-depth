<script lang="ts">
	import options from "virtual:vitepress-plugin-outline-depth/plugin-options";
	import { inBrowser } from "vitepress";
	import { ref, watch } from "vue";
	import { saveLocalStorage, loadLocalStorage } from "../composables/local-storage.js";
	import type { OutlineDepthLocalStorageConfigs } from "../types.js";

	const depth = ref(options.defaultDepth!);
	const autoExpand = ref(options.defaultAutoExpand!);
	const LOCAL_STORAGE_KEY = "vitepress-outline-depth";

	if (options.saveToLocalStorage && inBrowser) {
		const configs = loadLocalStorage<OutlineDepthLocalStorageConfigs>(LOCAL_STORAGE_KEY);
		if (configs) ({ depth: depth.value, autoExpand: autoExpand.value } = configs);
	}

	watch(
		[depth, autoExpand],
		([depth, autoExpand]) => {
			if (!inBrowser) return;
			const rootStyle = document.body.style;
			rootStyle.setProperty("--outline-depth", String(depth));
			rootStyle.setProperty("--outline-auto-expand", String(autoExpand));
			if (options.saveToLocalStorage) saveLocalStorage(LOCAL_STORAGE_KEY, { depth, autoExpand });
		},
		{ immediate: true },
	);
</script>

<script setup lang="ts">
	import { useLocales } from "../composables/locales.js";
	import OutlineDepthToggle from "./OutlineDepthToggle.Plain.vue";

	const locales = useLocales();
</script>

<template>
	<OutlineDepthToggle v-bind="options" :locales="locales" v-model:depth="depth" v-model:autoExpand="autoExpand" />
</template>
