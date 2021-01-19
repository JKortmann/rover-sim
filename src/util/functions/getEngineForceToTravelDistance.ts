import { mapEngineValues } from './mapEngineValues';

export const getEngineForceToTravelDistance = (distanceToLOI: number, speed: number): number => {
	if (distanceToLOI > 30) {
		return 1;
	}
	return mapEngineValues(Math.tanh(distanceToLOI - speed * (speed / 2)));
};
