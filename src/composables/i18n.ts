import { useData } from "vitepress";
import { computed } from "vue";

export function useI18n() {
	const { lang } = useData();
	const keys = computed(() => {
		const langValue = lang.value === "root" ? "en" : lang.value;
		let locale: Intl.Locale;
		try {
			locale = new Intl.Locale(langValue).maximize();
		} catch {
			locale = new Intl.Locale("en").maximize();
		}
		const { language, script, region } = locale;
		const keys = [
			...(script && region ? [`${language}-${script}-${region}`] : []),
			...(region ? [`${language}-${region}`] : []),
			...(script ? [`${language}-${script}`] : []),
			language,
		];
		return keys;
	});

	return function t(object: Record<string, string>) {
		return computed(() => {
			for (const key of keys.value) if (key in object) return object[key];
			return object.en;
		});
	};
}
