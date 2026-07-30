import { useData } from "vitepress";
import options from "virtual:outline-depth-plugin-options";
import type { OutlineDepthPluginOptions } from "../types.js";

const locales: NonNullable<OutlineDepthPluginOptions["locales"]> = {
	en: {
		depth: "Outline depth",
		autoExpand: "Auto expand",
	},
	zh: {
		depth: "目录层级",
		autoExpand: "自动展开",
	},
	...options.locales,
};

function getPossibleCurrentLocales(lang: string) {
	if (lang === "root") lang = "en";
	let locale: Intl.Locale;
	try {
		locale = new Intl.Locale(lang).maximize();
	} catch {
		return [lang];
	}
	const { language, script, region } = locale;
	const keys = [
		...(script && region ? [`${language}-${script}-${region}`] : []),
		...(region ? [`${language}-${region}`] : []),
		...(script ? [`${language}-${script}`] : []),
		language,
	];
	return keys;
}

export function useLocales() {
	const { lang } = useData();
	const keys = getPossibleCurrentLocales(lang.value);
	for (const key of keys) if (Object.hasOwn(locales, key)) return locales[key];
	return locales.en;
}
