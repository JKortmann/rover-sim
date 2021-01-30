import { mapEngineValues } from './mapEngineValues';

export const turnVehicle = (turnDegree: number, speed: number): number[] => {
	// let speed = 0.84;
	// if (Math.abs(turnDegree) < engineSpeed5) speed = 0.834;
	// if (Math.abs(turnDegree) < engineSpeed0) speed = 0.833;
	//
	// if (turnDegree > 0) {
	// 	return [-speed, speed, -speed, speed, -speed, speed];
	// } else {
	// 	return [speed, -speed, speed, -speed, speed, -speed];
	// }

	// console.log(turnDegree);

	const engineSpeed = Math.tanh(turnDegree - speed * (speed / 2));

	// console.log(engineSpeed);

	if (turnDegree > 0) {
		return [-engineSpeed, engineSpeed, -engineSpeed, engineSpeed, -engineSpeed, engineSpeed];
	} else {
		return [engineSpeed, -engineSpeed, engineSpeed, -engineSpeed, engineSpeed, -engineSpeed];
	}

	// return mapEngineValues(Math.tanh(turnDegree - speed * (speed / engineSpeed00)));
};
