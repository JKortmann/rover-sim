import { updateVisuals } from './visuals';
import { updateNormalazation, getNormalziedValues } from './normalization';
import { DrivingData } from './types/Driving';
import { getDrivingValues } from './driving';
import { ControlLoop, Simulation, AUTHENTICITY_LEVEL2, SensorValues, LocationOfInterest } from 'rover';
import LatLon from 'geodesy/latlon-spherical';

import { getPathForScanningRectangle, clamp, signedAngleDifference } from './util/functions';

import { Rectangle } from './types';

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

let currentDestinationIndex = 0;

const loop: ControlLoop = (sensorData, { engines, steering }) => {
	updateNormalazation(sensorData);
	const {
		location: { latitude, longitude },
		heading,
		proximity,
	} = sensorData;

	const { nVelocity, nLocation, nHeading, timeDelta } = getNormalziedValues();

	const drivingData = {};

	const currentDestination = destinations[currentDestinationIndex];
	const destinationPosition = new LatLon(currentDestination.latitude, currentDestination.longitude);
	const position = new LatLon(latitude, longitude);
	const distanceToDestination = position.distanceTo(destinationPosition);

	const desiredHeading = position.initialBearingTo(destinationPosition);
	const desiredHeadingDelta = signedAngleDifference(nHeading, desiredHeading);

	if (Math.round(nVelocity) === 0 && Math.floor(distanceToDestination) === 0) {
		if (currentDestinationIndex < destinations.length - 1) {
			currentDestinationIndex++;
		} else {
			// We're done!
		}
	}

	updateVisuals({
		timeDelta,
		nLocation,
		nVelocity,
		location: position,
		heading,
		nHeading,
		desiredHeading,
		desiredHeadingDelta,
		distanceToDestination,
		proximity,
	});
	return getDrivingValues(drivingData, engines, steering);
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
