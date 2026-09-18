import { defineComponent, onMounted, ref, type SlotsType } from "vue";

/**
 * Similar to
 * [`vitepress/src/client/app/components/ClientOnly.ts`](https://github.com/vuejs/vitepress/blob/3a49d35002f54531b121c99ee1b35239b99b7342/src/client/app/components/ClientOnly.ts),
 * but you can specify the server rendering as fallback.
 *
 * The API behavior is similar to [Nuxt ClientOnly.ts](https://nuxt.com/docs/4.x/api/components/client-only).
 */
const ClientOnly = defineComponent({
	slots: Object as SlotsType<{
		default?: {};
		fallback?: {};
	}>,

	setup(_, { slots }) {
		const client = ref(false);

		onMounted(() => {
			client.value = true;
		});

		return () => (client.value ? slots.default?.() : slots.fallback?.());
	},
});

export default ClientOnly;
