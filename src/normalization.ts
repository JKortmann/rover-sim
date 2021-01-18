import { Buffer } from './util/visuals/Buffer';
import { harmonicMean, geographicMidpointWithoutWeights } from './util/functions';

// TYPES
import { SensorValues } from 'rover';
import LatLon from 'geodesy/latlon-spherical';

// Buffer
const sensorDataBuffer = new Buffer<SensorValues>(5);

const velocityBuffer = new Buffer<number>(5);
const positionBuffer = new Buffer<LatLon>(10);
const headingBuffer = new Buffer<number>(25);

sensorDataBuffer.subscribe((values) => {
	const curr = values[0];
	const prev = values[1] as SensorValues | undefined; // We know, that for a single tick the buffer only contains a single item

	const timeDelta = curr.clock - (prev?.clock || 0);

	const position = new LatLon(curr.location.latitude, curr.location.longitude);
	const lastPosition = prev ? new LatLon(prev.location.latitude, prev.location.longitude) : position;
	const positionDelta = position.distanceTo(lastPosition);

	const velocity = positionDelta / (timeDelta / 1000); // in m/s
	const lastVelocity = velocityBuffer.item(0) || velocity;
	const velocityDelta = velocity - lastVelocity;

	const acceleration = velocityDelta / timeDelta;

	velocityBuffer.push(velocity);
});

// Normalized Values
// Prefix "n" for normalized
let nVelocity = 0;
velocityBuffer.subscribe((values) => {
	// TODO: Better calc of velocity
	nVelocity = harmonicMean(values);
});

let nLocation = new LatLon(0, 0);
let lastNPosition = new LatLon(0, 0);

positionBuffer.subscribe((values) => {
	lastNPosition = nLocation;
	nLocation = geographicMidpointWithoutWeights(values);
});

let nHeading = 0;
headingBuffer.subscribe((values) => {
	nHeading = harmonicMean(values);
});

let lastTime = 0;
let timeDelta = 0;

export const updateNormalazation = (sensorData: SensorValues) => {
	sensorDataBuffer.push(sensorData);

	const {
		location: { latitude, longitude },
		heading,
		clock,
		proximity,
	} = sensorData;

	timeDelta = lastTime - clock;
	lastTime = clock;

	positionBuffer.push(new LatLon(latitude, longitude));
	headingBuffer.push(heading);
};

export const getNormalziedValues = () => {
	return {
		nVelocity,
		nLocation,
		lastNPosition,
		nHeading,
		timeDelta,
	};
};
