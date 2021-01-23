import { getPathForScanningRectangle } from './util/functions';

import LatLon from 'geodesy/latlon-spherical';
import { Rectangle } from './types';

export class Navigator {
	origin: LatLon;
	destinations: LatLon[];
	currentDestinationIndex = -1;
	detectionWidth = 1;

	constructor(origin: LatLon, destinations: LatLon[], detectionWidth: number) {
		this.origin = origin;
		this.destinations = destinations;
		this.detectionWidth = detectionWidth;
	}

	get currentDestination() {
		if (this.destinations.length === 0) this.origin;
		return this.destinations[this.currentDestinationIndex];
	}

	reachedCurrentDestination() {
		if (this.currentDestinationIndex !== this.destinations.length - 1) this.currentDestinationIndex++;
	}

	addSearchArea(rectangle: Rectangle) {
		const lastDestination = this.destinations[this.destinations.length - 1] || this.origin;
		const rectanglePath = getPathForScanningRectangle(rectangle, lastDestination, this.detectionWidth);
		this.addDestinations(rectanglePath);
	}

	addDestinations(destinations: LatLon[]) {
		const updateCurrentDestination = this.destinations.length - 1 === this.currentDestinationIndex;
		this.destinations = [...this.destinations, ...destinations];
		if (updateCurrentDestination) this.reachedCurrentDestination();
	}
}
