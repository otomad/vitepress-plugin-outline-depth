<script setup lang="ts">
	import { useSmoothValue } from "smooth-value/vue";
	import { useTemplateRef, reactive, computed, ref, nextTick, watch } from "vue";
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

	const isRtl = () => document.documentElement.dir === "rtl";

	const value = defineModel<number>({ default: 0 });
	const linearPreciseOffsetValue = ref<number>();
	const setLinearPreciseOffsetValue = (preciseValue: number, min: number, max: number) => {
		linearPreciseOffsetValue.value = clamp(map(preciseValue, min, max, 0, 1), 0, 1);
		if (isRtl()) linearPreciseOffsetValue.value = 1 - linearPreciseOffsetValue.value;
	};
	const cssValue = computed(() => {
		const clampedCssValue = clamp(map(value.value, props.min, props.max, 0, 1), 0, 1);
		return linearPreciseOffsetValue.value == null
			? clampedCssValue
			: (linearPreciseOffsetValue.value + clampedCssValue * 1.5) / 2.5;
	});
	const smoothCssValue = useSmoothValue(cssValue, 0.5);

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
				setLinearPreciseOffsetValue(position, 0, width - thumbSize);
				emits("changing", newValue);
			},
			{ signal: aborter.signal },
		);
		thumb.addEventListener(
			"pointerup",
			() => {
				aborter.abort();
				thumb.releasePointerCapture(e.pointerId);
				linearPreciseOffsetValue.value = undefined;
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
		nextTick(() => setLinearPreciseOffsetValue(e.offsetX, thumbSizeHalf, width - thumbSizeHalf));
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
		:style="{ '--value': smoothCssValue }"
		@pointerdown="onTrackDown"
		@keydown="onKeyDown"
	>
		<div class="track"></div>
		<div class="past"></div>
		<div class="thumb" ref="thumb" @pointerdown="onThumbDown"></div>
	</div>
</template>

<style lang="css" scoped>
	.slider {
		--thumb-size: 20px;
		--track-thickness: 1px;

		position: relative;
		display: grid;
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

	.track,
	.past {
		inline-size: 100%;
		block-size: var(--track-thickness);
		margin-block: auto;
		border-radius: calc(infinity * 1px);
		grid-area: 1 / 1;
		transition: 250ms;
	}

	.track {
		background-color: var(--vp-input-border-color);
		transition-property: background-color;

		.slider:hover & {
			background-color: var(--gray9);

			html.dark & {
				--track-future-color: var(--gray8);
			}
		}
	}

	.past {
		background-color: var(--vp-c-brand-1);
		inline-size: calc(var(--value) * (100% - var(--thumb-size)) + var(--thumb-size) / 2);
		transition-property: background-color;

		.slider:hover & {
			background-color: var(--vp-c-brand-3);
		}
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
