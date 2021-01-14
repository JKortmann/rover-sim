import LatLonSpherical from 'geodesy/latlon-spherical'

export const getPointsDistancesAscending = (pointsToCompare: LatLonSpherical[], point: LatLonSpherical) => {
  return pointsToCompare.map(pointToCompare => ({
    point: pointToCompare,
    distance: pointToCompare.distanceTo(point)
  })).sort((a, b) => a.distance - b.distance).map(pointsWithDistances => pointsWithDistances.point)
}
