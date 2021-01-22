import { clamp } from './util/functions';

import { Navigator } from './Navigator';
import { MCU } from './MCU';
import { Engines, Steering } from './types';

const controlValues = {
	forward: 0,
	backward: 0,
	left: 0,
	right: 0,
};

export class Rover {
	navigator;
	mcu;
	hasSteering = false;
	constructor(navigator: Navigator, mcu: MCU, hasSterering: boolean) {
		this.navigator = navigator;
		this.mcu = mcu;
		this.hasSteering = hasSterering;
	}

	reachedTarget() {
		this.navigator.reachedCurrentDestination();
		this.mcu.updateDestination(this.navigator.currentDestination);
	}

	getDrivingValues(engines: Engines, steering: Steering) {
		engines = [0.8, 0.8] as Engines;
		steering = [180, 180] as Steering;

		// TODO: Implement logic to turn vehicle

		// if (Math.round(distanceToDestination) > 0) {
		// 	engines = engines.map(() => getEngineForceToTravelDistance(distanceToDestination, nVelocity)) as [
		// 		number,
		// 		number
		// 	];
		// }

		// TODO: Implement logic to drive vehicle

		// if (Math.round(desiredHeadingDelta) !== 0) {
		// 	engines = turnVehicle(desiredHeadingDelta) as [number, number];
		// }

		// TODO: Impmenet logic to avoid obstacles
		let proximityArray = this.mcu.sensorDataBuffer.item(0).proximity;
		let closestPointAngle = proximityArray.indexOf(Math.min(...proximityArray));
		let closestPointProximity = Math.min(...proximityArray);

		if ((closestPointProximity) < 3) {
			if (closestPointAngle >= 0 && closestPointAngle < 45) {
				// front right
				steering[0] = 180 - 10 - closestPointProximity;
				steering[1] = 180 + 10 + closestPointProximity;

			} else if (closestPointAngle > 135 && closestPointAngle <= 180) {
				// front left
				steering[0] = 180 + 10 + closestPointProximity;
				steering[1] = 180 - 10 - closestPointProximity;

			} else if (closestPointAngle > 45 && closestPointAngle <= 90) {
				// Back right
				steering[0] = 180 + 10 + closestPointProximity;
				steering[1] = 180 - 10 - closestPointProximity;

			} else if (closestPointAngle >= 90 && closestPointAngle < 135) {
				// Back left
				steering[0] = 180 - 10 - closestPointProximity;
				steering[1] = 180 + 10 + closestPointProximity;
			}
		}


		updateControlValuesFromGamepad();
		// If any steering overrides are happening
		if (Object.values(controlValues).some((v) => v !== 0)) {
			const MAX_STEERING_DEGREE = 10;
			const steerAngle = (controlValues.left - controlValues.right) * MAX_STEERING_DEGREE;
			engines = [0, 0] as Engines;
			steering = [180, 180] as Steering;

			engines = engines.map((e) => e + controlValues.forward) as Engines;
			engines = engines.map((e) => e - controlValues.backward) as Engines;

			steering[0] = 180 - steerAngle;
			steering[1] = 180 + steerAngle;

			engines = engines.map((v) => clamp(v, -1, 1)) as Engines;
		}

		return { engines, steering };
	}
}

function updateControlValuesFromGamepad() {
	const gamepad = navigator.getGamepads()?.[0];
	const buttons = gamepad?.buttons;
	const aButtonPressed = buttons?.[0]?.pressed;
	const xButtonPressed = buttons?.[2]?.pressed;
	const axes = gamepad?.axes;

	if (!axes) return;

	const vertical = axes[1];
	const horizontal = axes[0];

	controlValues.forward = aButtonPressed ? 1 : Math.max(0, -vertical);
	controlValues.backward = xButtonPressed ? 1 : Math.max(0, vertical);
	controlValues.left = Math.max(0, -horizontal);
	controlValues.right = Math.max(0, horizontal);
}

const controlMapping: Record<keyof typeof controlValues, string[]> = {
	forward: ['KeyW', 'ArrowUp'],
	backward: ['KeyS', 'ArrowDown'],
	left: ['KeyA', 'ArrowLeft'],
	right: ['KeyD', 'ArrowRight'],
};
window.addEventListener('keydown', (e) => {
	Object.entries(controlMapping).forEach(([key, codes]) => {
		if (codes.includes(e.code)) {
			controlValues[key as keyof typeof controlValues] = 1;
		}
	});
});
window.addEventListener('keyup', (e) => {
	Object.entries(controlMapping).forEach(([key, codes]) => {
		if (codes.includes(e.code)) {
			controlValues[key as keyof typeof controlValues] = 0;
		}
	});
});

window.addEventListener('gamepadconnected', (event) => {
	console.log('Gamepad connected ' + (event as any)?.gamepad?.id);
});
