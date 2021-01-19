import LatLon from 'geodesy/latlon-spherical';

export interface VisualData {
	velocity: number;
	nVelocity: number;
	timeDelta: number;
	position: LatLon;
	nPosition: LatLon;
	heading: number;
	nHeading: number;
	desiredHeading: number;
	desiredHeadingDelta: number;
	distanceToDestination: number;
	proximity: number[];
	lastNPosition: LatLon;
}
