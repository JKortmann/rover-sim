export const clamp = (num: number, min: number, max: number) => {
  return num <= min ? min : num >= max ? max : num;
};

export const geometricMean = (values: number[]) => {
  return Math.pow(
    Math.abs(
      values.reduce((acc, v) => {
        if (!acc) return v;
        return (acc * (v + 360) - 360) % 360;
      })
    ),
    1 / values.length
  );
};

export const arethmeticMean = (values: number[]) => {
  return values.reduce((acc, v) => acc + v, 0) / values.length;
};

export const averageAngle = (values: number[]) => {
  let x = 0;
  let y = 0;
  values.forEach((v) => {
    x += Math.cos(v);
    y += Math.sin(v);
  });
  return Math.atan2(y, x);
};

export const harmonicMean = (values: number[]) => {
  return (
    values.length /
    values.reduce(
      (accumulator, currentValue) => accumulator + 1 / currentValue,
      0
    )
  );
};

export const signedAngleDifference = (angle1: number, angle2: number) => {
  let a = angle2 - angle1;
  a -= a > 180 ? 360 : 0;
  a += a < -180 ? 360 : 0;
  return a;
};

export const turnVehicle = (turnDegree: number): number[] => {
  let speed = Math.abs(turnDegree) > 20 ? 0.6 : 0.2;
  if (turnDegree < 0) {
    return [-speed, speed];
  } else {
    return [speed, -speed];
  }
};

const mapEngineValues = (value: number) => {
  return (Math.abs(value) / 2 + 0.5) * (value < 0 ? -1 : 1);
};

export const getEngineForceToTravelDistance = (
  distanceToLOI: number,
  speed: number
): number => {
  if (distanceToLOI > 30) {
    return 1;
  }
  return mapEngineValues(Math.tanh(distanceToLOI - speed * (speed / 2)));
};
