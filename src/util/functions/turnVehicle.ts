export const turnVehicle = (turnDegree: number): number[] => {
	let speed = 0.84;
	if (Math.abs(turnDegree) < 15) speed = 0.834;
	if (Math.abs(turnDegree) < 10) speed = 0.8331;

	if (turnDegree > 0) {
		return [-speed, speed, -speed, speed, -speed, speed];
	} else {
		return [speed, -speed, speed, -speed, speed, -speed];
	}
};
