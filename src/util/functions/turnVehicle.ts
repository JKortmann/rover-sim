export const turnVehicle = (turnDegree: number): number[] => {
	const speed = Math.abs(turnDegree) > 20 ? 0.9 : 0.836;
	if (turnDegree > 0) {
		return [-speed, speed, -speed, speed, -speed, speed];
	} else {
		return [speed, -speed, speed, -speed, speed, -speed];
	}
};
