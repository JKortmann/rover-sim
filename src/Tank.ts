import { clamp, getEngnieSpeedByDistance, signedAngleDifference } from './util/functions';

import { Navigator } from './Navigator';
import { MCU } from './MCU';
import { Engines } from 'rover';
import LatLon from 'geodesy/latlon-spherical';
import { Display } from './util/visuals/Display';

const controlValues = {
	forward: 0,
	backward: 0,
	left: 0,
	right: 0,
};

let exitNormalRoutePosition: LatLon | undefined;
let turnDirection: number | undefined;

type TankState = 'idle' | 'aligning' | 'approaching' | 'circumnavigate' | 'manual';

const TankDisplay = new Display({ width: 900, height: 50, container: '#tankContainer' });

export class Tank {
	navigator;
	mcu;

	minObstacleDistance = 1;
	passedObstacle = false;

	engines: Engines = [0, 0, 0, 0, 0, 0];
	state: TankState = 'idle';

	manualControlTimeout: number | null = null;

	constructor(navigator: Navigator, mcu: MCU) {
		this.navigator = navigator;
		this.mcu = mcu;
	}

	next(engines: Engines) {
		this.engines = engines;

		this.updateState();
		this.updateEngines();

		this.engines = this.engines.map((v) => clamp(v, -1, 1)) as Engines;

		TankDisplay.next({
			state: this.state,
			engines: this.engines,
			orientationDelta: this.mcu.desiredHeadingDelta.toFixed(5),
		});

		return this.engines;
	}

	updateState() {
		IdleTransition: if (this.state === 'idle') {
			if (Math.abs(this.mcu.desiredHeadingDelta) > 0.5) {
				console.log('Setting state to aliginng');
				this.state = 'aligning';
				break IdleTransition;
			}

			if (Math.abs(this.mcu.distanceToDestination) > 0.5) {
				this.state = 'approaching';
				break IdleTransition;
			}
		}

		ApproachingTransition: if (this.state === 'approaching') {
			if (Math.abs(this.mcu.desiredHeadingDelta) > 2) {
				this.state = 'aligning';
				break ApproachingTransition;
			}
		}

		if (this.isTooCloseForComfort() && !this.passedObstacle) {
			console.log('Setting state to circumnavigate');
			this.state = 'circumnavigate';
		}

		updateControlValuesFromGamepad();
		if (Object.values(controlValues).some((v) => v !== 0)) {
			this.state = 'manual';

			if (this.manualControlTimeout != null) {
				clearTimeout(this.manualControlTimeout);
			}

			this.manualControlTimeout = window.setTimeout(() => {
				if (this.state === 'manual') {
					this.state = 'idle';
				}
			}, 1000);
		}

		this.updateEngines();
	}

	manualControl() {
		const engines = [0, 0, 0, 0, 0, 0];

		this.engines = engines.map((e, i) => {
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

	updateEngines() {
		switch (this.state) {
			case 'aligning': {
				this.alignToAngle(this.mcu.desiredHeadingDelta);
				break;
			}
			case 'approaching': {
				this.travelDistance(this.mcu.distanceToDestination);
				break;
			}
			case 'circumnavigate': {
				this.circumnavigate();
				break;
			}
			case 'manual': {
				this.manualControl();
				break;
			}
			default: {
				this.engines = this.toEngineValues(0);
				break;
			}
		}
	}

	travelDistance(distance: number) {
		let engine = 0;

		if (distance > 30) {
			engine = 1;
		}

		if (distance <= 30) {
			engine = getEngnieSpeedByDistance(distance, this.mcu.nVelocity);
			const closestPointProximity = Math.min(...this.mcu.proximity);
			if (closestPointProximity < 6 && closestPointProximity < distance) {
				engine = getEngnieSpeedByDistance(closestPointProximity, this.mcu.nVelocity);
			}
		}

		this.engines = this.toEngineValues(engine);

		// Condition when this function is done
		if (distance < 0.1) {
			this.state = 'idle';
		}
	}

	alignToAngle(targetRotation: number) {
		const direction = targetRotation > 0 ? 'right' : 'left';

		let fasterEngine: number;
		let slowerEngine: number;

		let speed = 0.84;
		if (Math.abs(targetRotation) < 15) speed = 0.834;
		if (Math.abs(targetRotation) < 10) speed = 0.8332;

		fasterEngine = speed;
		slowerEngine = -speed;

		if (direction === 'right') {
			this.engines = [slowerEngine, fasterEngine, slowerEngine, fasterEngine, slowerEngine, fasterEngine];
		} else {
			this.engines = [fasterEngine, slowerEngine, fasterEngine, slowerEngine, fasterEngine, slowerEngine];
		}

		if (Math.abs(targetRotation) < 0.5) {
			this.state = 'idle';
		}
	}

	toEngineValues(value: number) {
		return this.engines.map(() => (Math.abs(value) / 2 + 0.5) * (value < 0 ? -1 : 1)) as Engines;
	}

	circumnavigate() {
		let engines = this.engines;

		const closestPointProximity = Math.min(...this.mcu.proximity);
		const closestPointAngle =
			(360 / this.mcu.proximity.length) * this.mcu.proximity.indexOf(Math.min(...this.mcu.proximity));

		this.passedObstacle =
			exitNormalRoutePosition && turnDirection
				? signedAngleDifference(
						exitNormalRoutePosition.initialBearingTo(this.mcu.position),
						exitNormalRoutePosition.initialBearingTo(this.navigator.currentDestination)
				  ) *
						turnDirection <
						0.1 && exitNormalRoutePosition.distanceTo(this.mcu.position) > 0.3
				: false;

		if (
			closestPointProximity < 6 &&
			closestPointProximity > this.minObstacleDistance &&
			!engines.some((v) => v !== engines[0])
		) {
			return [0.6, 0.6, 0.6, 0.6, 0.6, 0.6] as Engines;
		}

		if (this.isTooCloseForComfort() && !this.passedObstacle) {
			if (!exitNormalRoutePosition) {
				exitNormalRoutePosition = this.mcu.position;
				turnDirection = (closestPointAngle / 90) % 2 < 1 ? 1 : -1;
			}
			engines = [0.6, 0.6, 0.6, 0.6, 0.6, 0.6];
			engines = engines.map((e, i) => {
				if ((closestPointAngle / 90) % 2 > 1) {
					if (i % 2 === 0) {
						e -= e;
					} else {
						e += e;
					}
				} else if ((closestPointAngle / 90) % 2 < 1) {
					if (i % 2 === 0) {
						e += e;
					} else {
						e -= e;
					}
				}
				return e;
			}) as Engines;
		}

		if (!this.isTooCloseForComfort()) {
			exitNormalRoutePosition = undefined;
		}

		this.engines = engines;

		if (!this.isTooCloseForComfort() || this.passedObstacle) {
			this.state = 'idle';
		}
	}

	isTooCloseForComfort() {
		return Math.min(...this.mcu.proximity) < this.minObstacleDistance;
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
