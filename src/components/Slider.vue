<script setup lang="ts">
	import { useTemplateRef, reactive, computed } from "vue";
	import { clamp, map } from "../composables/math.js";

	const props = withDefaults(
		defineProps<{
			min?: number;
			max?: number;
			step?: number;
		}>(),
		{
			min: 0,
			max: 100,
			step: undefined,
		},
	);

	const emits = defineEmits<{
		change: [value: number];
		changing: [value: number];
	}>();

	const value = defineModel<number>({ default: 0 });
	const cssValue = computed(() => clamp(map(value.value, props.min, props.max, 0, 1), 0, 1));

	const sliderEl = useTemplateRef("slider");
	const thumbEl = useTemplateRef("thumb");

	const _cssVars = reactive({
		thumbSize: undefined! as number,
		// trackThickness: undefined! as number,
	});
	function useCssVars() {
		if (sliderEl.value) {
			const style = getComputedStyle(sliderEl.value);
			_cssVars.thumbSize ??= parseFloat(style.getPropertyValue("--thumb-size"));
			// _cssVars.trackThickness ??= parseFloat(style.getPropertyValue("--track-thickness"));
		}
		return _cssVars;
	}
	const isRtl = () => document.documentElement.dir === "rtl";
	const removeSelection = () => {
		document.getSelection()?.removeAllRanges();
	};

	function clampValue(value: number) {
		value = clamp(value, props.min, props.max);
		if (props.step !== undefined) value = Math.round((value - props.min) / props.step) * props.step + props.min;
		return value;
	}

	function onThumbDown(e: PointerEvent, triggerByTrack: boolean = false) {
		const slider = sliderEl.value,
			thumb = thumbEl.value;
		e.stopPropagation();
		if (e.button || !slider || !thumb) return;
		removeSelection();
		const { thumbSize } = useCssVars();
		const { left, width } = slider.getBoundingClientRect();
		const x = triggerByTrack ? thumbSize / 2 : e.clientX - left - thumb.offsetLeft;
		const aborter = new AbortController();
		thumb.setPointerCapture(e.pointerId);
		thumb.addEventListener(
			"pointermove",
			(e: PointerEvent) => {
				removeSelection();
				const position = clamp(e.clientX - left - x, 0, width - thumbSize);
				let newValue = clampValue(map(position, 0, width - thumbSize, props.min, props.max));
				if (isRtl()) newValue = props.max - newValue + props.min;
				value.value = newValue;
				emits("changing", newValue);
			},
			{ signal: aborter.signal },
		);
		thumb.addEventListener(
			"pointerup",
			() => {
				aborter.abort();
				thumb.releasePointerCapture(e.pointerId);
				emits("change", value.value);
			},
			{ signal: aborter.signal },
		);
	}

	function onTrackDown(e: PointerEvent) {
		const slider = sliderEl.value;
		if (!slider) return;
		removeSelection();
		const { thumbSize } = useCssVars();
		const thumbSizeHalf = thumbSize / 2;
		const { width } = slider.getBoundingClientRect();
		let newValue = clampValue(map(e.offsetX, thumbSizeHalf, width - thumbSizeHalf, props.min, props.max));
		if (isRtl()) newValue = props.max - newValue + props.min;
		value.value = newValue;
		emits("changing", newValue);
		onThumbDown(e, true); // Then call the dragging slider event.
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.code === "Space") {
			e.preventDefault();
			return;
		}
		const rtl = isRtl();
		const increase = ["ArrowUp", !rtl ? "ArrowRight" : "ArrowLeft", "PageUp", "End"].includes(e.code);
		const decrease = ["ArrowDown", !rtl ? "ArrowLeft" : "ArrowRight", "PageDown", "Home"].includes(e.code);
		if (!decrease && !increase) return;
		e.preventDefault();
		e.stopPropagation();
		const newValue =
			e.code === "Home"
				? props.min
				: e.code === "End"
					? props.max
					: clampValue(value.value + (decrease ? -1 : 1) * (props.step ?? 1));
		value.value = newValue;
	}
</script>

<template>
	<div
		class="slider"
		role="slider"
		ref="slider"
		:tabindex="0"
		:aria-valuemin="min"
		:aria-valuemax="max"
		:aria-valuenow="value"
		:style="{ '--value': cssValue }"
		@pointerdown="onTrackDown"
		@keydown="onKeyDown"
	>
		<div class="track"></div>
		<div class="thumb" ref="thumb" @pointerdown="onThumbDown"></div>
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
		user-select: none;
		touch-action: none;

		&:focus-visible {
			outline: none;

			.thumb {
				box-shadow: 0 0 0 2px var(--vp-c-text-1) inset;
			}
		}
	}

	.track {
		--direction-towards: right;
		--slider-track-color-stop-percentage: calc(var(--value) * (100% - var(--thumb-size)) + var(--thumb-size) / 2);
		inline-size: 100%;
		block-size: var(--track-thickness);
		margin-block: auto;
		border-radius: calc(infinity * 1px);
		background-image: linear-gradient(
			to var(--direction-towards),
			var(--vp-c-brand-1) var(--slider-track-color-stop-percentage),
			var(--vp-input-border-color) var(--slider-track-color-stop-percentage)
		);
		transition: --slider-track-color-stop-percentage 250ms;

		&:dir(rtl) {
			--direction-towards: left;
		}
	}

	@property --slider-track-color-stop-percentage {
		syntax: "<length-percentage>";
		initial-value: 0;
		inherits: true;
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
		transition-property: background-color, border, inset-inline-start;
		inset-inline-start: calc(var(--value) * (100% - var(--thumb-size)));

		.slider:active &,
		&:is(:hover, :active) {
			border-color: var(--vp-c-brand-1);
		}

		.slider:active & {
			background-color: var(--vp-c-bg-soft);
		}

		:where(html.dark) & {
			background-color: var(--vp-c-default-2);
			border-color: var(--vp-input-border-color);
		}

		:where(html.dark) .slider:active & {
			background-color: var(--vp-c-default-3);
		}
	}
</style>
