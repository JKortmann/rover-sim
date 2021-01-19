import { getPathForScanningRectangle } from './util/functions';

import LatLon from 'geodesy/latlon-spherical';
import { Rectangle } from './types';

export class Navigator {
	origin: LatLon;
	destinations: LatLon[];
	currentDestinationIndex = 0;
	detectionWidth = 1;

	constructor(origin: LatLon, destinations: LatLon[], detectionWidth: number) {
		this.origin = origin;
		this.destinations = destinations;
		this.detectionWidth = detectionWidth;
	}

	get currentDestination() {
		return this.destinations[this.currentDestinationIndex];
	}

	reachedCurrentDestination() {
		if (this.currentDestinationIndex !== this.destinations.length - 1) this.currentDestinationIndex++;
	}

	addSearchArea(rectangle: Rectangle) {
		const lastDestination = this.destinations[this.destinations.length - 1] || this.origin;
		const rectanglePath = getPathForScanningRectangle(rectangle, lastDestination, this.detectionWidth);
		this.destinations.concat(rectanglePath);
	}

	addDestinations(destinations: LatLon[]) {
		this.destinations.concat(destinations);
	}
}
