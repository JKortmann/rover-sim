export const mapEngineValues = (value: number) => {
	return (Math.abs(value) / 2 + 0.5) * (value < 0 ? -1 : 1);
};
