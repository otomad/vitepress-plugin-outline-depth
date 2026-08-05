<script lang="ts">
	import options from "virtual:vitepress-plugin-outline-depth/plugin-options";
	import { inBrowser } from "vitepress";
	import { ref, watch, useId, onMounted, onUnmounted } from "vue";
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
	import Slider from "./Slider.vue";
	import VPSwitch from "./Switch.vue";

	const locales = useLocales();
	const id = useId();

	const outlineMarker = ref<HTMLDivElement>();
	const observer = ref<MutationObserver>();

	function focusForElementByLabel(e: Event) {
		const label = e.currentTarget as HTMLLabelElement;
		document.getElementById(label.htmlFor)?.focus();
	}

	onMounted(() => {
		if (!options.scrollActiveOutlineLinkIntoView) return;
		outlineMarker.value = document.querySelector<HTMLDivElement>(".outline-marker")!;
		observer.value = new MutationObserver(([mutation]) => {
			if (mutation.type === "attributes" && mutation.attributeName === "style") {
				outlineMarker.value?.scrollIntoView({ behavior: "smooth", block: "center", container: "nearest" });
			}
		});
		observer.value.observe(outlineMarker.value, { attributes: true });
	});

	onUnmounted(() => {
		observer.value?.disconnect();
	});
</script>

<template>
	<div class="outline-depth-toggle" :class="{ stick: options.stickAtTop }">
		<div class="content">
			<label :for="`${id}-depth`" @click="focusForElementByLabel">{{ locales.depth }}</label>
			<div class="slider-wrapper">
				<Slider :id="`${id}-depth`" :min="options.minDepth" :max="options.maxDepth" :step="1" v-model="depth" />
			</div>
			<label :for="`${id}-auto-expand`">{{ locales.autoExpand }}</label>
			<label>
				<VPSwitch :id="`${id}-auto-expand`" v-model="autoExpand" :disabled="depth === 6" />
			</label>
		</div>
	</div>
</template>

<style scoped>
	.outline-depth-toggle {
		container: outline-depth-toggle / scroll-state;
		z-index: 2;

		.content {
			display: grid;
			grid-template-columns: auto 1fr;
			gap: 8px 6.4px;
			align-items: center;
			padding-block: 4px;
			padding-inline: 16px 0;
			border-inline-start: 1px solid var(--vp-c-divider);
		}

		&:has(~ .VPDocAsideOutline:not(.has-outline)) {
			display: none;
		}

		&.stick {
			position: sticky;
			/* CAUTION: Cannot omit the `0px` to `0`! */
			inset-block-start: calc(0px - var(--vp-layout-top-height, 0px) - var(--vp-doc-top-height, 0px) - 42px);

			.content {
				background-color: var(--vp-c-bg);
				transition: background-color cubic-bezier(0, 0, 0, 1) 100ms;

				@container outline-depth-toggle not scroll-state(stuck: block-start) {
					background-color: transparent;
				}

				@container outline-depth-toggle scroll-state(stuck: block-start) {
					--aside-curtain-mask-size: 24px;
					mask: linear-gradient(
						to bottom,
						black calc(100% - var(--aside-curtain-mask-size)),
						transparent 100%
					);
					padding-block: 10px calc(4px + var(--aside-curtain-mask-size));
					margin-block: -6px calc(-1 * var(--aside-curtain-mask-size));
				}
			}
		}
	}

	label {
		white-space: nowrap;
		font-size: 0.875rem;
		color: var(--vp-c-text-2);
	}

	.VPSwitch {
		justify-self: end;
	}

	.slider-wrapper {
		padding-inline-end: 1px;
	}
</style>

<style>
	.VPDocOutlineItem.root ul {
		transition:
			block-size cubic-bezier(0, 0, 0, 1) 250ms,
			visibility 250ms;
		transition-behavior: allow-discrete;
		overflow: clip;

		@starting-style {
			block-size: 0;
		}

		:active-view-transition & {
			transition: none;
		}
	}

	/*
	 * 原计划直接写 `@container style(--outline-depth < 6)` 等，但截至目前（2026年）只有 Chromium，而且 LightningCSS 编译时还会报错。参见：
	 * https://caniuse.com/wf-style-query-range-syntax
	 * https://github.com/parcel-bundler/lightningcss/issues/1069
	 */

	/* @container style(--outline-depth < 6) { */
	@container style(--outline-depth: 2) or style(--outline-depth: 3) or style(--outline-depth: 4) or style(--outline-depth: 5) {
		.VPDocOutlineItem.root > li > ul > li > ul > li > ul > li > ul {
			visibility: collapse;
			block-size: 0;
			--collapse: true;
		}
		.VPDocOutlineItem.root > li > ul > li > ul > li > ul > li:has(.outline-link.active) > a {
			color: var(--vp-c-text-1);
			anchor-name: --outline-link-active;
		}
	}
	/* @container style(--outline-depth < 5) { */
	@container style(--outline-depth: 2) or style(--outline-depth: 3) or style(--outline-depth: 4) {
		.VPDocOutlineItem.root > li > ul > li > ul > li > ul {
			visibility: collapse;
			block-size: 0;
			--collapse: true;
		}
		.VPDocOutlineItem.root > li > ul > li > ul > li:has(.outline-link.active) > a {
			color: var(--vp-c-text-1);
			anchor-name: --outline-link-active;
		}
	}
	/* @container style(--outline-depth < 4) { */
	@container style(--outline-depth: 2) or style(--outline-depth: 3) {
		.VPDocOutlineItem.root > li > ul > li > ul {
			visibility: collapse;
			block-size: 0;
			--collapse: true;
		}
		.VPDocOutlineItem.root > li > ul > li:has(.outline-link.active) > a {
			color: var(--vp-c-text-1);
			anchor-name: --outline-link-active;
		}
	}
	/* @container style(--outline-depth < 3) { */
	@container style(--outline-depth: 2) {
		.VPDocOutlineItem.root > li > ul {
			visibility: collapse;
			block-size: 0;
			--collapse: true;
		}
		.VPDocOutlineItem.root > li:has(.outline-link.active) > a {
			color: var(--vp-c-text-1);
			anchor-name: --outline-link-active;
		}
	}
	@container style(--outline-auto-expand: true) {
		.VPDocOutlineItem.root .outline-link.active + ul,
		.VPDocOutlineItem.root ul:has(.outline-link.active) {
			visibility: visible;
			block-size: auto;
			--collapse: false;
		}
		.VPDocOutlineItem.root a:not(.active, :hover, #\#) {
			color: var(--vp-c-text-2);
			anchor-name: none !important;
		}
	}
	.outline-link.active {
		anchor-name: --outline-link-active;
	}
	@container style(--collapse: true) {
		.outline-link {
			anchor-name: none !important;
		}
	}

	.VPDocAsideOutline > .content {
		.outline-marker:not([style*="opacity: 0"]) {
			position-anchor: --outline-link-active;
			top: calc((anchor(top) + anchor(bottom) - 18px) / 2) !important;
		}
	}

	/**
	 * Fix Component: Mouse Wheel Overscroll the Outline will Unexpectedly Trigger Page Scroll
	 */
	.VPDoc .aside-container,
	.VPLocalNavOutlineDropdown .items {
		overscroll-behavior: contain;
	}
</style>
