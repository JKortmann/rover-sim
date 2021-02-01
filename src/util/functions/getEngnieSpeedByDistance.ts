import { mapEngineValues } from './';

export const getEngnieSpeedByDistance = (distance: number, velocity: number) => {
	return mapEngineValues(Math.tanh(distance - velocity * (velocity / 2)));
};
