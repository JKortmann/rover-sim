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

export class Tank {
	navigator;
	mcu;
	constructor(navigator: Navigator, mcu: MCU) {
		this.navigator = navigator;
		this.mcu = mcu;
	}

	getDrivingValues(engines: Engines) {
		engines = [0, 0] as Engines;

		// TODO: Implement logic to turn vehicle

		if (Math.round(this.mcu.distanceToDestination) > 0) {
			const engineSpeed = getEngineForceToTravelDistance(this.mcu.distanceToDestination, this.mcu.nVelocity);
			engines = [engineSpeed, engineSpeed];
		}

		// TODO: Implement logic to drive vehicle

		if (Math.round(this.mcu.desiredHeadingDelta) !== 0) {
			engines = turnVehicle(this.mcu.desiredHeadingDelta) as [number, number];
		}

		// TODO: Impmenet logic to avoid obstacles

		updateControlValuesFromGamepad();
		// If any steering overrides are happening
		if (Object.values(controlValues).some((v) => v !== 0)) {
			engines = [0, 0] as [number, number];

			engines[0] += controlValues.forward;
			engines[1] += controlValues.forward;

			engines[0] -= controlValues.backward;
			engines[1] -= controlValues.backward;

			engines[0] -= controlValues.left;
			engines[1] += controlValues.left;

			engines[0] += controlValues.right;
			engines[1] -= controlValues.right;

			engines = engines.map((v) => clamp(v, -1, 1)) as [number, number];
		}

		return { engines };
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
