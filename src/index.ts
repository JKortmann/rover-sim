import { Rover } from './Rover';
import { MCU } from './MCU';
import { Navigator } from './Navigator';
import { ControlLoop, Simulation, AUTHENTICITY_LEVEL2, LocationOfInterest } from 'rover';
import LatLon from 'geodesy/latlon-spherical';

import { Rectangle } from './types';

const hasSteering = false; // Determins if rover has steering axios
const origin = new LatLon(52.477050353132384, 13.395281227289209);
const detectionWidth = 1; // in m
const destinations: LatLon[] = [];
const searchArea: Rectangle = [
	new LatLon(52.47707415932714, 13.39510403573513),
	new LatLon(52.47707415932714, 13.395281061530113),
	new LatLon(52.47723419690555, 13.395281061530113),
	new LatLon(52.47723419690555, 13.39510403573513),
];

const navigator = new Navigator(origin, destinations, detectionWidth);
const mcu = new MCU();
const rover = new Rover(navigator, mcu, hasSteering);

navigator.addSearchArea(searchArea);

const loop: ControlLoop = (sensorData, { engines, steering }) => {
	mcu.updateValues(sensorData);

	return rover.getDrivingValues(engines, steering);
};

// Only for visual purpose to show the bordes of the search Area
const rectangle: LocationOfInterest[] = [
	...searchArea.map((point, index) => ({
		latitude: point.latitude,
		longitude: point.longitude,
		label: `R${index}`,
	})),
];

const simulation = new Simulation({
	loop,
	origin: {
		latitude: 52.477050353132384,
		longitude: 13.395281227289209,
	},
	element: document.querySelector('main') as HTMLElement,
	locationsOfInterest: [...rectangle],
	renderingOptions: {
		width: 900,
		height: 900,
	},
	obstacles: [
		{ latitude: 52.47707415932714, longitude: 13.39510403573513, radius: 0.5 },
		{ latitude: 52.47707415932714, longitude: 13.39559403573513, radius: 0.5 },
		{ latitude: 52.47715035313238, longitude: 13.39528122728920, radius: 2 },
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
