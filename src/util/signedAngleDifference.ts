export const signedAngleDifference = (angle1: number, angle2: number) => {
	let a = angle2 - angle1;
	a -= a > 180 ? 360 : 0;
	a += a < -180 ? 360 : 0;
	return a;
};
