import { clamp, getEngineForceToTravelDistance, turnVehicle } from './util/functions';

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

	getDrivingValues(engines: Engines, steering: Steering) {
		engines = [0, 0] as Engines;
		steering = [180, 180] as Steering;

		// TODO: Implement logic to turn vehicle

		if (Math.round(this.mcu.distanceToDestination) > 0) {
			engines = engines.map(() =>
				getEngineForceToTravelDistance(this.mcu.distanceToDestination, this.mcu.nVelocity)
			) as [number, number];
		}

		// TODO: Implement logic to drive vehicle

		if (Math.round(this.mcu.desiredHeadingDelta) !== 0) {
			engines = turnVehicle(this.mcu.desiredHeadingDelta) as [number, number];
		}

		// TODO: Impmenet logic to avoid obstacles

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
