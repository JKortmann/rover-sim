import { Rover } from './Rover';
import { Tank } from './Tank';
import { MCU } from './MCU';
import { Navigator } from './Navigator';
import { ControlLoop, Simulation, AUTHENTICITY_LEVEL0, LocationOfInterest, VehicleType } from 'rover';
import LatLon from 'geodesy/latlon-spherical';

import { Rectangle } from './types';

const vehicleType = VehicleType.Tank; // Determins if rover has steering axios
const origin = new LatLon(52.472579849222434, 13.408491315033999);
const detectionWidth = 1; // in m
const destinations: LatLon[] = [];
const searchArea: Rectangle = [
	new LatLon(52.47349201059195, 13.407833537403034), // Top left
	new LatLon(52.47349201059195, 13.408905206933467),
	new LatLon(52.47262544876193, 13.407833537403034),
	new LatLon(52.47262544876193, 13.408905206933467), // Bottom Right
];

const navigator = new Navigator(origin, destinations, detectionWidth);
const mcu = new MCU(origin, navigator);

const rover = new Rover(navigator, mcu);
const tank = new Tank(navigator, mcu);

navigator.addSearchArea(searchArea);

const loop: ControlLoop = (sensorData, { engines, steering }) => {
	mcu.updateValues(sensorData);

	// @ts-ignore
	if (vehicleType === VehicleType.Rover) {
		return rover.getDrivingValues(engines, steering);
	} else {
		return { engines: tank.next(engines), steering: [180, 180, 180, 180] };
	}
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
	vehicleType,
	origin,
	element: document.querySelector('main') as HTMLElement,
	locationsOfInterest: [...rectangle],
	renderingOptions: {
		width: 900,
		height: 900,
	},
	obstacles: [
		{
			radius: 1.5,
			latitude: 52.473349975964524,
			longitude: 13.408410590227112,
		},
		{
			radius: 1.5,
			latitude: 52.47334842753099,
			longitude: 13.408562210366549,
		},
		{
			radius: 2,
			latitude: 52.473289718711364,
			longitude: 13.40855661992137,
		},
	],
	physicalConstraints: AUTHENTICITY_LEVEL0,
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
