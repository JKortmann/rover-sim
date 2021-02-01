import LatLong from 'geodesy/latlon-spherical';
import { degToRad } from './degToRad';
import { radToDeg } from './radToDeg';

export const geographicMidpointWithoutWeights = (points: LatLong[]) => {
	const cartesianPoints = points.map((point) => {
		const latRad = degToRad(point.latitude);
		const lonRad = degToRad(point.longitude);
		return {
			x: Math.cos(latRad) * Math.cos(lonRad),
			y: Math.cos(latRad) * Math.sin(lonRad),
			z: Math.sin(latRad),
		};
	});

	const totalWeight = cartesianPoints.length; // weight for each point are equal to 1 => totalWeight = w1 + w2 + ... + wn

	const avrgX = cartesianPoints.reduce((acc, val) => acc + val.x, 0) / totalWeight;
	const avrgY = cartesianPoints.reduce((acc, val) => acc + val.y, 0) / totalWeight;
	const avrgZ = cartesianPoints.reduce((acc, val) => acc + val.z, 0) / totalWeight;

	const hyp = Math.sqrt(Math.pow(avrgX, 2) + Math.pow(avrgY, 2));
	const avrgLat = Math.atan2(avrgZ, hyp);
	const avrgLon = Math.atan2(avrgY, avrgX);

	return new LatLong(radToDeg(avrgLat), radToDeg(avrgLon));
};
