export const averageAngle = (values: number[]) => {
	let x = 0;
	let y = 0;
	values.forEach((v) => {
		x += Math.sin(((v + 90) * Math.PI) / 180);
		y += Math.cos(((v + 90) * Math.PI) / 180);
	});
	let heading = Math.atan2(y, x) % (2 * Math.PI);
	if (heading < 0) {
		heading += 2 * Math.PI;
	}
	const trueHeading = 360 - (180 / Math.PI) * heading;
	return trueHeading;
};
