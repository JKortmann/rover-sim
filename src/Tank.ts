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

type TankState = 'idle' | 'aligning' | 'approaching' | 'circumnavigate' | 'manual';

const TankDisplay = new Display({ width: 900, height: 60, container: '#tankContainer' });

export class Tank {
	navigator;
	mcu;

	minObstacleDistance = 1.5;
	isAviodingObstacle = false;

	engines: Engines = [0, 0, 0, 0, 0, 0];
	state: TankState = 'idle';

	exitNormalRoutePosition: LatLon | undefined;
	turnDirection: number | undefined;

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
			engines: `left: ${this.engines[0].toFixed(3)}, right: ${this.engines[1].toFixed(3)}`,
			angularVelocity: this.mcu.nAngularVelocity.toFixed(3),
			orientationDelta: this.mcu.desiredHeadingDelta.toFixed(4),
		});

		return this.engines;
	}

	updateState() {
		IdleTransition: if (this.state === 'idle') {
			if (Math.abs(this.mcu.desiredHeadingDelta) > 0.5) {
				this.state = 'aligning';
				break IdleTransition;
			}

			if (Math.abs(this.mcu.distanceToDestination) > 0.3) {
				this.state = 'approaching';
				break IdleTransition;
			}
		}

		if (this.hasObstacleAhead() || this.isAviodingObstacle) {
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
		}

		// TODO: Maybe change to a more values
		const closestPointProximity = this.mcu.proximity[0];
		if (this.hasObstacleAhead(7) && closestPointProximity < distance) {
			engine = getEngnieSpeedByDistance(closestPointProximity - this.minObstacleDistance, this.mcu.nVelocity);
		}

		this.engines = this.toEngineValues(engine);

		if (Math.abs(this.mcu.desiredHeadingDelta) > 1) {
			this.engines = this.engines.map((e, i) => {
				if (Math.sign(this.mcu.desiredHeadingDelta) === 1) {
					if (i % 2 !== 1) {
						return e / 4;
					}
					return e;
				} else {
					if (i % 2 !== 1) {
						return e;
					}
					return e / 4;
				}
			}) as Engines;
		}

		if (distance < 0.1 || Math.abs(this.mcu.desiredHeadingDelta) > 2) {
			// Condition when this function is done
			this.state = 'idle';
		}
	}

	alignToAngle(targetRotation: number) {
		const direction = targetRotation > 0 ? 'right' : 'left';
		let engine = 0;

		let fasterEngine: number;
		let slowerEngine: number;

		if (Math.abs(this.mcu.nVelocity) < 0.1) {
			// We're standing still
			engine = 0.84;
			if (Math.abs(this.mcu.nAngularVelocity) > 7) engine = 0.834;

			fasterEngine = engine;
			slowerEngine = -engine;
		} else {
			// We're driving
			fasterEngine = -Math.sign(this.mcu.nVelocity);
			slowerEngine = -Math.sign(this.mcu.nVelocity);
		}

		if (direction === 'right') {
			this.engines = [slowerEngine, fasterEngine, slowerEngine, fasterEngine, slowerEngine, fasterEngine];
		} else {
			this.engines = [fasterEngine, slowerEngine, fasterEngine, slowerEngine, fasterEngine, slowerEngine];
		}

		if (Math.abs(targetRotation) < 0.2 && this.mcu.nAngularVelocity < 0.01) {
			this.state = 'idle';
		}
	}

	toEngineValues(value: number) {
		if (value === 0) {
			return [0, 0, 0, 0, 0, 0] as Engines;
		}

		return this.engines.map(() => (Math.abs(value) / 2 + 0.5) * (value < 0 ? -1 : 1)) as Engines;
	}

	circumnavigate() {
		let engines = this.engines;

		const closestPointAngle =
			(360 / this.mcu.proximity.length) * this.mcu.proximity.indexOf(Math.min(...this.mcu.proximity));

		const passedObstacle =
			this.exitNormalRoutePosition && this.turnDirection
				? signedAngleDifference(
						this.exitNormalRoutePosition.initialBearingTo(this.mcu.position),
						this.exitNormalRoutePosition.initialBearingTo(this.navigator.currentDestination)
				  ) *
						this.turnDirection <
						0.1 && this.exitNormalRoutePosition.distanceTo(this.mcu.position) > 0.3
				: false;

		if (!passedObstacle) {
			if (!this.exitNormalRoutePosition) {
				this.exitNormalRoutePosition = this.mcu.position;
				this.turnDirection = (closestPointAngle / 90) % 2 < 1 ? 1 : -1;
			}
			this.isAviodingObstacle = true;
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
		} else {
			this.exitNormalRoutePosition = undefined;
			this.isAviodingObstacle = false;
			this.state = 'idle';
		}

		this.engines = engines;
	}

	hasObstacleAhead(distance: number = this.minObstacleDistance) {
		const degreesPerProximityUnit = 360 / this.mcu.proximity.length;
		const proximityAhead: number[] = [];
		this.mcu.proximity.forEach((p, i) => {
			if (i * degreesPerProximityUnit < 10 || i * degreesPerProximityUnit > 350) {
				proximityAhead.push(p);
			}
		});
		return Math.min(...proximityAhead) < distance;
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
