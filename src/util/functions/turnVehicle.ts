import { Engines } from 'rover';
import { Display } from '../visuals/Display';

interface TurnVehicleArgs {
	targetRotation: number;
	velocity: number;
}

export const turnVehicle = ({ targetRotation, velocity }: TurnVehicleArgs): Engines => {
	const direction = targetRotation > 0 ? 'right' : 'left';

	let fasterEngine: number;
	let slowerEngine: number;

	// if (velocity > 0.1) {
	// 	// We're currently driving
	//
	// 	fasterEngine = 1;
	// 	slowerEngine = 0.5;
	// } else {
	// We're very close to standing still
	let speed = 0.84;
	if (Math.abs(targetRotation) < 15) speed = 0.834;
	if (Math.abs(targetRotation) < 10) speed = 0.8332;

	fasterEngine = speed;
	slowerEngine = -speed;
	// }

	// turnVehicleDisplay.next({ velocity: velocity });

	if (direction === 'right') {
		return [slowerEngine, fasterEngine, slowerEngine, fasterEngine, slowerEngine, fasterEngine];
	} else {
		return [fasterEngine, slowerEngine, fasterEngine, slowerEngine, fasterEngine, slowerEngine];
	}
};
