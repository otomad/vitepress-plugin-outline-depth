export function saveLocalStorage(key: string, object: unknown) {
	localStorage.setItem(key, JSON.stringify(object));
}

export function loadLocalStorage<T>(key: string): T | null {
	const json = localStorage.getItem(key);
	if (json == null) return null;
	return JSON.parse(json);
}
