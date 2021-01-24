import {
	clamp,
	getEngineForceToTravelDistance,
	turnVehicle,
	avoidObstacles,
	updateControlValuesFromGamepad,
} from './util/functions';

import { Navigator } from './Navigator';
import { MCU } from './MCU';
import { Engines } from 'rover';

const controlValues = {
	forward: 0,
	backward: 0,
	left: 0,
	right: 0,
};

export class Tank {
	navigator;
	mcu;
	isInit = false;
	minTurningSpeed = 0;
	constructor(navigator: Navigator, mcu: MCU) {
		this.navigator = navigator;
		this.mcu = mcu;
	}

	init() {
		// TODO: Get min speed for turning
		// TODO: Calc the acceleration ?
		this.minTurningSpeed = 1;
		this.isInit = true;
	}

	getDrivingValues(engines: Engines) {
		engines = [0, 0, 0, 0, 0, 0] as Engines;

		if (!this.isInit) {
			this.init();
		} else {
			// TODO: Implement logic to turn vehicle

			if (Math.round(this.mcu.distanceToDestination) > 0) {
				const engineSpeed = getEngineForceToTravelDistance(this.mcu.distanceToDestination, this.mcu.nVelocity);
				engines = engines.map(() => engineSpeed) as Engines;
			}

			// TODO: Implement logic to drive vehicle

			if (Math.round(this.mcu.desiredHeadingDelta) !== 0) {
				if (Math.round(this.mcu.nVelocity) === 0) {
					engines = turnVehicle(this.mcu.desiredHeadingDelta) as Engines;
				} else {
					engines = [0, 0, 0, 0, 0, 0];
				}
			}

			engines = avoidObstacles(engines, this.mcu.proximity, this.mcu.desiredHeadingDelta);

			updateControlValuesFromGamepad(controlValues);
		}
		// If any steering overrides are happening
		if (Object.values(controlValues).some((v) => v !== 0)) {
			engines = [0, 0, 0, 0, 0, 0];

			engines = engines.map((e, i) => {
				if (i % 2 === 0) {
					e += controlValues.forward;
					e -= controlValues.backward;
					e += controlValues.left;
					e -= controlValues.right;
				} else {
					e += controlValues.forward;
					e -= controlValues.backward;
					e -= controlValues.left;
					e += controlValues.right;
				}
				return e;
			}) as Engines;
		}
		engines = engines.map((v) => clamp(v, -1, 1)) as Engines;
		return { engines };
	}
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
