import { Navigator } from './Navigator';
import { Buffer } from './util/visuals/Buffer';
import { signedAngleDifference, harmonicMean, geographicMidpointWithoutWeights } from './util/functions';
import { updateVisuals } from './visuals';

// Types
import { SensorValues } from 'rover';
import LatLon from 'geodesy/latlon-spherical';

export class MCU {
	destination: LatLon;
	position: LatLon;
	navigator: Navigator;
	// Buffer
	sensorDataBuffer = new Buffer<SensorValues>(5);
	velocityBuffer = new Buffer<number>(5);
	angularVelocityBuffer = new Buffer<number>(5);
	positionBuffer = new Buffer<LatLon>(10);
	headingBuffer = new Buffer<number>(25);
	// Computed Values
	distanceToDestination = 0;
	desiredHeading = 0;
	desiredHeadingDelta = 0;
	timeDelta = 0;
	// Nomalized Vales
	nVelocity = 0;
	nAngularVelocity = 0;
	nPosition = new LatLon(0, 0);
	nHeading = 0;
	proximity: number[] = [];
	// Last Values
	lastNPosition = new LatLon(0, 0);
	loopCallback: any[] = [];

	constructor(position: LatLon, navigator: Navigator) {
		this.destination = navigator.currentDestination || position;
		this.navigator = navigator;
		this.position = position;
	}

	onLoop(fn: any) {
		this.loopCallback.push(fn);
	}

	updateValues(sensorData: SensorValues) {
		this.sensorDataBuffer.push(sensorData);
		this.destination = this.navigator.currentDestination;
		const {
			location: { latitude, longitude },
			heading,
			clock,
			proximity,
		} = sensorData;

		this.proximity = proximity;
		this.position = new LatLon(latitude, longitude);

		if (this.positionBuffer.values.length) {
			this.lastNPosition = geographicMidpointWithoutWeights(this.positionBuffer.values);
		} else {
			this.lastNPosition = this.position;
		}

		this.positionBuffer.push(this.position);
		this.headingBuffer.push(heading);

		const previous = this.sensorDataBuffer?.previous() || sensorData;
		this.timeDelta = clock - (previous.clock || 0);

		const positionDelta = this.position.distanceTo(
			new LatLon(previous.location.latitude, previous.location.longitude)
		);

		this.distanceToDestination = this.position.distanceTo(this.destination);

		this.desiredHeading = this.position.initialBearingTo(this.destination);
		this.desiredHeadingDelta = signedAngleDifference(this.nHeading, this.desiredHeading);

		if (isNaN(this.desiredHeading)) {
			this.desiredHeading = 0;
			this.desiredHeadingDelta = 0;
		}

		const previousHeading = this.headingBuffer.previous();
		const latestHeading = this.headingBuffer.latest();

		const headingDelta = signedAngleDifference(previousHeading, latestHeading) || 0;

		const angularVelocity = headingDelta / (this.timeDelta / 1000);

		this.angularVelocityBuffer.push(angularVelocity);

		const velocity = positionDelta / (this.timeDelta / 1000);

		this.velocityBuffer.push(velocity);

		this.nVelocity = harmonicMean(this.velocityBuffer.values);
		this.nAngularVelocity = harmonicMean(this.angularVelocityBuffer.values);
		this.nPosition = geographicMidpointWithoutWeights(this.positionBuffer.values);
		this.nHeading = harmonicMean(this.headingBuffer.values);

		if (this.distanceToDestination < 0.5) {
			this.navigator.reachedCurrentDestination();
		}

		this.loopCallback.forEach((fn) => fn());
	}
}
