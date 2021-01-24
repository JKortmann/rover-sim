import { Engines } from 'rover';

export const avoidObstacles = (
	engines: Engines,
	proximityArray: number[],
	desiredHeadingDelta: number,
	minDistanceToObstacle = 4
) => {
	const closestPointProximity = Math.min(...proximityArray);
	const closestPointAngle = (360 / proximityArray.length) * proximityArray.indexOf(Math.min(...proximityArray));

	const isCloseToObstacle = closestPointProximity < minDistanceToObstacle;
	const passedObstacle = !(Math.abs(closestPointAngle - desiredHeadingDelta) >= 180);

	if (isCloseToObstacle && passedObstacle) {
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
	return engines;
};
