import { ControlLoop, Simulation, AUTHENTICITY_LEVEL2, SensorValues, LocationOfInterest } from 'rover';
import LatLon from 'geodesy/latlon-spherical';
import { Buffer } from './Buffer';
import { Display } from './Display';
import { Graph } from './Graph';
import {
	harmonicMean,
	geometricMean,
	clamp,
	signedAngleDifference,
	getEngineForceToTravelDistance,
	turnVehicle,
} from './util';

import { Engines, Rectangle, Steering } from './types';
import { getPathForScanningRectangle } from './util';
import { geographicMidpointWithoutWeights } from './util/geographicMidpointWithoutWeights';
import { geographicMidpointWithWeights } from './util/geographicMidpointWithWeights';
import { Chart } from './Chart';

const debugPosition = new LatLon(52.477050353132384, 13.395281227289209);
const debugRectangle: Rectangle = [
	new LatLon(52.47707415932714, 13.39510403573513),
	new LatLon(52.47707415932714, 13.395281061530113),
	new LatLon(52.47723419690555, 13.395281061530113),
	new LatLon(52.47723419690555, 13.39510403573513),
];

const rectangle: LocationOfInterest[] = [
	...debugRectangle.map((point, index) => ({
		latitude: point.latitude,
		longitude: point.longitude,
		label: `R${index}`,
	})),
];

const debugDetectionWidth = 1; // in m

const rectanglePath = getPathForScanningRectangle(debugRectangle, debugPosition, debugDetectionWidth);

const destinations: LocationOfInterest[] = [
	...rectanglePath.map((point, index) => ({
		latitude: point.latitude,
		longitude: point.longitude,
		label: index.toString(),
	})),
];

let simulation: Simulation | null;

const controlValues = {
	forward: 0,
	backward: 0,
	left: 0,
	right: 0,
};

let iteration = 0;
const sensorDataBuffer = new Buffer<SensorValues>(5);

const velocityBuffer = new Buffer<number>(5);
const accelerationBuffer = new Buffer<number>(5);
const positionBuffer = new Buffer<LatLon>(10);
const orientationBuffer = new Buffer<number>(25);

sensorDataBuffer.subscribe((values) => {
	const curr = values[0];
	const prev = values[1] as SensorValues | undefined; // We know, that for a single tick the buffer only contains a single item

	const timeDelta = curr.clock - (prev?.clock || 0);

	const lastPosition = prev ? new LatLon(prev.location.latitude, prev.location.longitude) : nPosition;
	const positionDelta = nPosition.distanceTo(lastPosition);

	const velocity = positionDelta / (timeDelta / 1000); // in m/s
	const lastVelocity = velocityBuffer.item(0) || velocity;
	const velocityDelta = velocity - lastVelocity;

	const acceleration = velocityDelta / timeDelta;

	velocityBuffer.push(velocity);
	accelerationBuffer.push(acceleration);
	// nOrientation = geometricMean(values.map((value) => value.heading));
});

// Prefix "n" for normalized
let nVelocity = 0;
velocityBuffer.subscribe((values) => {
	nVelocity = harmonicMean(values);
});

let nAcceleration = 0;
accelerationBuffer.subscribe((values) => {
	nAcceleration = harmonicMean(values);
});

const tempDistanceBuffer = new Buffer<number>(50);

let nPosition = new LatLon(0, 0);
let lastNPosition = nPosition;
positionBuffer.subscribe((values) => {
	lastNPosition = nPosition;
	nPosition = geographicMidpointWithoutWeights(values);
	if (nPositionDeltaChart?.chartjs?.data?.datasets?.[0].data) {
		const distance = lastNPosition.distanceTo(nPosition);
		tempDistanceBuffer.push(distance);
		const maxDistance = Math.max(...tempDistanceBuffer.values);
		nPositionDeltaChart.chartjs.data.datasets[0].data = [lastNPosition.distanceTo(nPosition)];
		nPositionDeltaChart.chartjs.data.datasets[1].data = [maxDistance];
		nPositionDeltaChart.chartjs.update();
	}
});

let nOrientation = 0;
orientationBuffer.subscribe((values) => {
	nOrientation = harmonicMean(values);
});

let lastClock = 0;
let lastPosition: LatLon | null = null;

const display = new Display({ width: 900, height: 200 });
const velocityGraph = new Graph(
	{ width: 900, height: 100 },
	{
		velocity: {
			color: '#ff0',

			range: [0, 30],
		},
		nVelocity: {
			color: '#f0f',
			range: [0, 30],
		},
		timeDelta: {
			color: '#0ff',
			range: [10, 30],
		},
	}
);

const latitudeGraph = new Graph(
	{ width: 900, height: 100 },
	{
		latitude: {
			color: '#f0f',
			range: [52.477, 52.478],
		},
		nLatitude: {
			color: '#0ff',
			range: [52.477, 52.478],
		},
	}
);

const orientationGraph = new Graph(
	{ width: 900, height: 360 },
	{
		orientation: {
			color: '#f0f',
			range: [0, 360],
		},
		nOrientation: {
			color: '#0ff',
			range: [0, 360],
		},
	}
);

const positionChart = new Chart(
	{
		width: 400,
		height: 400,
	},
	{
		type: 'scatter',
		data: {
			datasets: [
				{
					label: 'nPosition',
					backgroundColor: 'red',
				},
				{
					label: 'positions',
					backgroundColor: 'white',
				},
			],
		},
		options: {
			scales: {
				xAxes: [
					{
						type: 'linear',
						position: 'bottom',
						ticks: {
							suggestedMin: 13.39523,
							suggestedMax: 13.39534,
						},
					},
				],
				yAxes: [
					{
						type: 'linear',
						position: 'left',
						ticks: {
							suggestedMin: 52.47701,
							suggestedMax: 52.47709,
						},
					},
				],
			},
			responsive: false,
			animation: {
				duration: 0,
			},
			hover: {
				animationDuration: 0,
			},
			responsiveAnimationDuration: 0,
		},
	}
);

const nPositionDeltaChart = new Chart(
	{
		height: 400,
		width: 400,
	},
	{
		type: 'bar',
		data: {
			datasets: [
				{
					label: 'nPositionDelta',
					backgroundColor: 'pink',
				},
				{
					label: 'nPositionDelta',
					backgroundColor: 'transparent',
					borderColor: 'red',
					borderWidth: 2,
				},
			],
		},
		options: {
			scales: {
				yAxes: [
					{
						type: 'linear',
						ticks: {
							max: 2.5,
							min: 0,
						},
						position: 'bottom',
					},
				],
				xAxes: [
					{
						id: 'nPositionDelta',
						stacked: true,
					},
					{
						id: 'nPositionDeltaMax',
						offset: true,
						stacked: true,
					},
				],
			},
			responsive: false,
			animation: {
				duration: 0,
			},
			hover: {
				animationDuration: 0,
			},
			responsiveAnimationDuration: 0,
		},
	}
);

let currentDestinationIndex = 0;

const loop: ControlLoop = (sensorData, { engines, steering }) => {
	sensorDataBuffer.push(sensorData);

	const {
		location: { latitude, longitude },
		heading,
		clock,
		proximity,
	} = sensorData;

	positionBuffer.push(new LatLon(latitude, longitude));
	orientationBuffer.push(heading);

	if (positionChart?.chartjs?.data?.datasets?.[0].data) {
		positionChart.chartjs.data.datasets[1].data = positionBuffer.values.map((value) => ({
			x: value.longitude,
			y: value.latitude,
		}));
		positionChart.chartjs.data.datasets[0].data = [{ x: nPosition.longitude, y: nPosition.latitude }];
		positionChart.chartjs.update();
	}

	const timeDelta = clock - lastClock;

	engines = [0, 0] as Engines;
	steering = [180, 180] as Steering;

	const currentDestination = destinations[currentDestinationIndex];
	const destinationPosition = new LatLon(currentDestination.latitude, currentDestination.longitude);
	const position = new LatLon(latitude, longitude);
	const distanceToDestination = position.distanceTo(destinationPosition);

	const desiredOrientation = position.initialBearingTo(destinationPosition);
	const desiredOrientationDelta = signedAngleDifference(nOrientation, desiredOrientation);

	// if (Math.round(distanceToDestination) > 0) {
	// 	const enginePower = getEngineForceToTravelDistance(distanceToDestination, nVelocity);
	// 	console.log(enginePower);
	// 	engines = [enginePower, enginePower];
	// }

	// if (Math.round(desiredOrientationDelta) !== 0) {
	// 	engines = turnVehicle(desiredOrientationDelta) as [number, number];
	// }

	if (Math.round(nVelocity) === 0 && Math.floor(distanceToDestination) === 0) {
		if (currentDestinationIndex < destinations.length - 1) {
			currentDestinationIndex++;
		} else {
			// We're done!
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

	lastClock = clock;
	lastPosition = position;
	iteration++;

	velocityGraph.next({
		velocity: velocityBuffer.latest(),
		nVelocity,
		timeDelta,
	});

	latitudeGraph.next({
		latitude,
		nLatitude: nPosition.latitude,
	});

	orientationGraph.next({
		orientation: heading,
		nOrientation,
	});

	display.next({
		proximity: proximity[0] + 'm',
		position: latitude + ', ' + longitude,
		nPosition: nPosition.latitude + ', ' + nPosition.longitude,
		desiredOrientationDelta: desiredOrientationDelta + ' deg',
		desiredOrientation: desiredOrientation + ' deg',
		orientation: heading + ' deg',
		nOrientation: nOrientation + ' deg',
		nVelocity: nVelocity + ' m/s',
		nAcceleration: nAcceleration * 100 + ' cm/s^2',
		distanceToDestination: distanceToDestination + 'm',
		engines: JSON.stringify(engines),
		steering: JSON.stringify(steering),
		ctrlV: JSON.stringify(controlValues),
		timeDelta: timeDelta + '',
		destination: destinations[currentDestinationIndex].label,
	});

	return { engines, steering };
};
simulation = new Simulation({
	loop,
	origin: {
		latitude: 52.477050353132384,
		longitude: 13.395281227289209,
	},
	element: document.querySelector('main') as HTMLElement,
	locationsOfInterest: [...rectangle, ...destinations],
	renderingOptions: {
		width: 900,
		height: 900,
	},
	obstacles: [
		{ latitude: 52.47707415932714, longitude: 13.39510403573513, radius: 0.5 },
		{ latitude: 52.47707415932714, longitude: 13.39559403573513, radius: 0.5 },
	],
	physicalConstraints: AUTHENTICITY_LEVEL2,
});

simulation.start();

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

let simulationState: 'running' | 'stopped' = 'running';
window.addEventListener('keypress', (e) => {
	if (e.code === 'KeyP') {
		if (simulationState === 'running') {
			simulation?.stop();
			simulationState = 'stopped';
		} else if (simulationState === 'stopped') {
			simulation?.start();
			simulationState = 'running';
		}
	}
});

window.addEventListener('gamepadconnected', (event) => {
	console.log('Gamepad connected ' + (event as any)?.gamepad?.id);
});

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
