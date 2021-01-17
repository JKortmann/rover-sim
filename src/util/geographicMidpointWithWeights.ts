import LatLong from 'geodesy/latlon-spherical';
import { degToRad } from './degToRad';
import { normalize } from './normalize';
import { radToDeg } from './radToDeg';

export const geographicMidpointWithWeights = (points: LatLong[], startPoint: LatLong) => {
	const distancesForPoints = points.map(point => startPoint.distanceTo(point))

	const distancesMax = Math.max(...distancesForPoints)
	const distancesMin = Math.min(...distancesForPoints)

	const normalizedDistances = distancesForPoints.map(distance => normalize(distance, distancesMin, distancesMax))
	const weightsForPoints = normalizedDistances.map(nDistance => 1 - nDistance)

	const totalWeight = weightsForPoints.reduce((acc, val) => acc + val, 0)

	const cartesianPoints = points.map(point => {
		const latRad = degToRad(point.latitude)
		const lonRad = degToRad(point.longitude)
		return {
			x: Math.cos(latRad) * Math.cos(lonRad),
			y: Math.cos(latRad) * Math.sin(lonRad),
			z: Math.sin(latRad),
		}
	})

	const avrgX = cartesianPoints.reduce((acc, val, index) => acc + (val.x * weightsForPoints[index]) , 0) / totalWeight
	const avrgY = cartesianPoints.reduce((acc, val, index) => acc + (val.y * weightsForPoints[index]) , 0) / totalWeight
	const avrgZ = cartesianPoints.reduce((acc, val, index) => acc + (val.z * weightsForPoints[index]) , 0) / totalWeight

	const avrgHyp = Math.sqrt((Math.pow(avrgX, 2) + Math.pow(avrgY, 2)))
	const avrgLat = Math.atan2(avrgZ, avrgHyp)
	const avrgLon = Math.atan2(avrgY, avrgX)

	return new LatLong(radToDeg(avrgLat), radToDeg(avrgLon))
}
