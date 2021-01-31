import {
	clamp,
	getEngineForceToTravelDistance,
	turnVehicle,
	avoidObstacles,
	signedAngleDifference,
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

const calibrationOptions = {
	minHeadingDifference: 0.01,
	engineSpeedIncrease: 0.1,
};

export class Tank {
	navigator;
	mcu;
	state = 'calibrating';
	minTurningSpeed = 0;
	minDrivingSpeed = 0;
	testEngineValue = 0;
	lastTestEngineValue = 0;

	constructor(navigator: Navigator, mcu: MCU) {
		this.navigator = navigator;
		this.mcu = mcu;
	}

	private async stopVehicle() {
		setInterval(() => {
			if (this.headingDifference === 0) Promise.resolve();
		}, 50);
	}

	private get headingDifference() {
		const previousHeading = this.mcu.headingBuffer.previous();
		const latestHeading = this.mcu.headingBuffer.latest();

		return signedAngleDifference(previousHeading, latestHeading) || 0;
	}

	private calibrateTurningSpeed(): Engines {
		const absoluteHeadingDifference = Math.abs(this.headingDifference);
		const hasVehicleTurned = absoluteHeadingDifference >= calibrationOptions.minHeadingDifference;
		const isVehiceStopped = absoluteHeadingDifference === 0;

		console.group('Calibrating turning speed');
		console.log('hasVehicleTurned', hasVehicleTurned);
		console.log('absoluteHeadingDifference', absoluteHeadingDifference);
		console.log('testEngineValue', this.testEngineValue);
		console.groupEnd();

		if (hasVehicleTurned) {
			this.minTurningSpeed = this.testEngineValue;
		}

		if (!hasVehicleTurned && absoluteHeadingDifference > 0) {
			this.testEngineValue = 0;
		}

		if (isVehiceStopped) {
			const newTestEngineValue = this.lastTestEngineValue + calibrationOptions.engineSpeedIncrease;

			this.testEngineValue = newTestEngineValue;
			this.lastTestEngineValue = newTestEngineValue;
		}

		return [
			-this.testEngineValue,
			this.testEngineValue,
			-this.testEngineValue,
			this.testEngineValue,
			-this.testEngineValue,
			this.testEngineValue,
		];
	}

	calibrate(engines: Engines): Engines {
		if (!this.minTurningSpeed) {
			return this.calibrateTurningSpeed();
		}

		if (this.minDrivingSpeed === 0) {
			// calibrate driving
		}

		this.minDrivingSpeed = 1;
		// Start to test different engine values for turning and driving.

		// When done set calibrate to true
		this.state = 'ready';

		return [0, 0, 0, 0, 0, 0];
	}

	getDrivingValues(engines: Engines) {
		engines = [0, 0, 0, 0, 0, 0] as Engines;

		// TODO: Implement logic to turn vehicle

		if (Math.round(this.mcu.distanceToDestination) > 0) {
			const engineSpeed = getEngineForceToTravelDistance(this.mcu.distanceToDestination, this.mcu.nVelocity);
			engines = engines.map(() => engineSpeed) as Engines;
		}

		// TODO: Implement logic to drive vehicle

		if (Math.round(this.mcu.desiredHeadingDelta) !== 0) {
			engines = turnVehicle(this.mcu.desiredHeadingDelta) as Engines;
		}

		engines = avoidObstacles(engines, this.mcu.proximity, this.mcu.position, this.navigator.currentDestination);

		updateControlValuesFromGamepad();

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
