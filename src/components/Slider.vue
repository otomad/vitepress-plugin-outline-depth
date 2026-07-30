<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
	defineProps<{
		min?: number;
		max?: number;
		step?: number;
	}>(),
	{
		min: 0,
		max: 100,
		step: 1,
	},
);

const value = defineModel<number>({ default: 0 });
</script>

<template>
	<div
		role="slider"
		class="slider"
		:aria-valuemin="min"
		:aria-valuemax="max"
		:aria-valuenow="value"
		:style="{ '--value': value }"
	>
		<div class="track"></div>
		<div class="thumb"></div>
	</div>
</template>

<style lang="css" scoped>
.slider {
	--thumb-size: 20px;
	--track-thickness: 1px;

	position: relative;
	inline-size: 100%;
	block-size: var(--thumb-size);
	align-content: center;
	cursor: pointer;
}

.track {
	inline-size: 100%;
	block-size: var(--track-thickness);
	margin-block: auto;
	border-radius: calc(infinity * 1px);
	background-color: var(--vp-input-border-color);
}

.thumb {
	position: absolute;
	inline-size: var(--thumb-size);
	block-size: var(--thumb-size);
	border-radius: 100%;
	background-color: var(--vp-c-neutral-inverse);
	border: 1px solid var(--vp-c-gutter);
	box-shadow: var(--vp-shadow-1);
	inset-block-start: 0;
	transition: 250ms;
	transition-property: background-color, border;
}

.slider:active .thumb,
.thumb:is(:hover, :active) {
	border-color: var(--vp-c-brand-1);
}

.slider:active .thumb {
	background-color: var(--vp-c-bg-soft);
}
</style>
