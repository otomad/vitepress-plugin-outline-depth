export const clamp = (value: number, min?: number, max?: number) =>
	min !== undefined && value < min ? min : max !== undefined && value > max ? max : value;

export const map = (x: number, min: number, max: number, a: number, b: number) =>
	((b - a) * (x - min)) / (max - min) + a;
