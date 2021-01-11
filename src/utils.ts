export const clamp = (num: number, min: number, max: number) => {
    return num <= min ? min : num >= max ? max : num;
}

export const harmonicMean = (values: number[]) => {
    return values.length / values.reduce((accumulator, currentValue) => accumulator + (1 / currentValue), 0)
}

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
    return ((Math.abs(value) / 2) + 0.5) * (value < 0 ? -1 : 1)
};

export const getEngineForceToTravelDistance = (
    distanceToLOI: number,
    speed: number
): number => {
    if (distanceToLOI > 30) {
        return 1;
    }
    return mapEngineValues(
      Math.tanh(distanceToLOI - speed * (speed / 2))
    );
};
