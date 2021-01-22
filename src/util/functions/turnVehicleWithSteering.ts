import { Steering } from 'rover';

export const turnVehicleWithSteering = (turnDegree: number): Steering => {
	let steering = 180 + turnDegree;
	if (steering < 170) steering = 170;
	if (steering > 190) steering = 190;
	return [steering, -steering, steering, -steering];
};
