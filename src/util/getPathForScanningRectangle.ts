import { Rectangle } from '../types'
import LatLong from 'geodesy/latlon-spherical'
import { getPointsDistancesAscending } from './index'


export const getPathForScanningRectangle = (rectangle: Rectangle, currentLocation: LatLong, detectionWidth: number) => {
  const rectanglePointDistances = getPointsDistancesAscending(rectangle, currentLocation)
  const closestRectanglePoint = rectanglePointDistances[0]
  const distancesRemainingRectanglePoints = getPointsDistancesAscending(rectangle, closestRectanglePoint).slice(1)
  const pointForLongSide = distancesRemainingRectanglePoints[1]
  const pointForShortSide = distancesRemainingRectanglePoints[0]
  const furthestPoint = distancesRemainingRectanglePoints[2]

  const distanceShortSide = pointForShortSide.distanceTo(closestRectanglePoint)
  const shortSideSections = Math.ceil(distanceShortSide / detectionWidth)

  const points: LatLong[] = []

  for (let i = 1; i <= shortSideSections; i += 2) {
    if (i % 3 === 0) {
      points.push(pointForLongSide.intermediatePointTo(furthestPoint, i / shortSideSections))
      points.push(closestRectanglePoint.intermediatePointTo(pointForShortSide, i / shortSideSections))
    } else {
      points.push(closestRectanglePoint.intermediatePointTo(pointForShortSide, i / shortSideSections))
      points.push(pointForLongSide.intermediatePointTo(furthestPoint, i / shortSideSections))
    }
  }

  return points
}
