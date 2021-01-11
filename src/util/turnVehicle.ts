export const turnVehicle = (turnDegree: number): number[] => {
  let speed = Math.abs(turnDegree) > 20 ? 0.6 : 0.2;
  if (turnDegree < 0) {
    return [-speed, speed];
  } else {
    return [speed, -speed];
  }
};
