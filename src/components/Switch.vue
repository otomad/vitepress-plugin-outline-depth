<script setup lang="ts">
	// See: https://github.com/vuejs/vitepress/blob/main/src/client/theme-default/components/VPSwitch.vue
	const on = defineModel<boolean>({ default: false });
</script>

<template>
	<button class="VPSwitch" type="button" role="switch" @click="on = !on">
		<span class="check" />
		<input type="checkbox" v-model="on" />
	</button>
</template>

<style scoped>
	.VPSwitch {
		position: relative;
		border-radius: 11px;
		display: block;
		width: 40px;
		height: 22px;
		flex-shrink: 0;
		border: 1px solid var(--vp-input-border-color);
		background-color: var(--vp-input-switch-bg-color);
		transition: 250ms !important;
		transition-property: border-color, background-color, opacity !important;

		&:hover:not(:disabled) {
			border-color: var(--vp-c-brand-1);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.check {
		position: absolute;
		top: 1px;
		/*rtl:ignore*/
		left: 1px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background-color: var(--vp-c-neutral-inverse);
		box-shadow: var(--vp-shadow-1);
		transition: all 250ms !important;

		.VPSwitch:active:not(:disabled) & {
			background-color: var(--vp-c-bg-soft);
		}
	}

	input {
		display: none;
	}

	.VPSwitch:has(input:checked) {
		background-color: var(--vp-c-brand-1);
		border-color: var(--vp-c-brand-1);

		&:hover:not(:disabled) {
			background-color: var(--vp-c-brand-3);
			border-color: var(--vp-c-brand-3);
		}

		.check {
			translate: 18px;
		}
	}

	html.dark .VPSwitch:not(:has(input:checked)) {
		.check {
			background-color: var(--vp-c-default-2);
		}

		&:active:not(:disabled) .check {
			background-color: var(--vp-c-default-3);
		}
	}
</style>
