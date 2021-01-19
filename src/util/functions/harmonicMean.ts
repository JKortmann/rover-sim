export const harmonicMean = (values: number[]) => {
	return values.length / values.reduce((accumulator, currentValue) => accumulator + 1 / currentValue, 0);
};
