export const turnVehicle = (turnDegree: number): number[] => {
	const speed = Math.abs(turnDegree) > 20 ? 0.9 : 0.9;
	if (turnDegree < 0) {
		return [-speed, speed];
	} else {
		return [speed, -speed];
	}
};
