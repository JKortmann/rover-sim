export const geometricMean = (values: number[]) => {
	return Math.pow(
		Math.abs(
			values.reduce((acc, v) => {
				if (!acc) return v;
				return (acc * (v + 360) - 360) % 360;
			})
		),
		1 / values.length
	);
};
