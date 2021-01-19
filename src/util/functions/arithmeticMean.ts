export const arithmeticMean = (values: number[]) => {
	return values.reduce((acc, v) => acc + v, 0) / values.length;
};
