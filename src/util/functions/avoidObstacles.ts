import { signedAngleDifference } from './';
import LatLon from 'geodesy/latlon-spherical';
import { Engines } from 'rover';

let exitNormalRoutePosition: LatLon | undefined;
let turnDirection: number | undefined;

export const avoidObstacles = (
	engines: Engines,
	proximityArray: number[],
	position: LatLon,
	destination: LatLon,
	minDistanceToObstacle = 4
) => {
	const closestPointProximity = Math.min(...proximityArray);
	const closestPointAngle = (360 / proximityArray.length) * proximityArray.indexOf(Math.min(...proximityArray));

	const isCloseToObstacle = closestPointProximity < minDistanceToObstacle;
	const passedObstacle =
		exitNormalRoutePosition && turnDirection
			? signedAngleDifference(
					exitNormalRoutePosition.initialBearingTo(position),
					exitNormalRoutePosition.initialBearingTo(destination)
			  ) *
					turnDirection <
					0.1 && exitNormalRoutePosition.distanceTo(position) > 0.3
			: false;

	if (isCloseToObstacle && !passedObstacle) {
		if (!exitNormalRoutePosition) {
			exitNormalRoutePosition = position;
			turnDirection = (closestPointAngle / 90) % 2 < 1 ? 1 : -1;
		}
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
	}

	if (!isCloseToObstacle) {
		exitNormalRoutePosition = undefined;
	}
	return engines;
};
