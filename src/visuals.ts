import LatLon from 'geodesy/latlon-spherical';
import { Buffer } from './util/visuals/Buffer';
import { Display } from './util/visuals/Display';
import { Graph } from './util/visuals/Graph';
import { Chart } from './util/visuals/Chart';
import { VisualData } from './types';

const positionBuffer = new Buffer<LatLon>(40);
const tempDistanceBuffer = new Buffer<number>(40);

const display = new Display({ width: 900, height: 200 });
const velocityGraph = new Graph(
	{ width: 900, height: 100 },
	{
		velocity: {
			color: '#ff0',
			range: [0, 25],
		},
		nVelocity: {
			color: '#f0f',
			range: [0, 25],
		},
		timeDelta: {
			color: '#0ff',
			range: [10, 25],
		},
	}
);

const positionChart = new Chart(
	{
		width: 400,
		height: 400,
	},
	{
		type: 'scatter',
		data: {
			datasets: [
				{
					label: 'nPosition',
					backgroundColor: 'red',
				},
				{
					label: 'positions',
					backgroundColor: 'white',
				},
			],
		},
		options: {
			scales: {
				xAxes: [
					{
						type: 'linear',
						position: 'bottom',
						ticks: {
							suggestedMin: 13.39523,
							suggestedMax: 13.39534,
						},
					},
				],
				yAxes: [
					{
						type: 'linear',
						position: 'left',
						ticks: {
							suggestedMin: 52.47701,
							suggestedMax: 52.47709,
						},
					},
				],
			},
			responsive: false,
			animation: {
				duration: 0,
			},
			hover: {
				animationDuration: 0,
			},
			responsiveAnimationDuration: 0,
		},
	}
);

const nPositionDeltaChart = new Chart(
	{
		height: 400,
		width: 400,
	},
	{
		type: 'bar',
		data: {
			datasets: [
				{
					label: 'nPositionDelta',
					backgroundColor: 'pink',
				},
				{
					label: 'nPositionDelta',
					backgroundColor: 'transparent',
					borderColor: 'red',
					borderWidth: 2,
				},
			],
		},
		options: {
			scales: {
				yAxes: [
					{
						type: 'linear',
						ticks: {
							max: 2.5,
							min: 0,
						},
						position: 'bottom',
					},
				],
				xAxes: [
					{
						id: 'nPositionDelta',
						stacked: true,
					},
					{
						id: 'nPositionDeltaMax',
						offset: true,
						stacked: true,
					},
				],
			},
			responsive: false,
			animation: {
				duration: 0,
			},
			hover: {
				animationDuration: 0,
			},
			responsiveAnimationDuration: 0,
		},
	}
);

export const updateVisuals = (data: VisualData) => {
	const {
		destination,
		velocity,
		nVelocity,
		timeDelta,
		position,
		nPosition,
		heading,
		nHeading,
		desiredHeading,
		desiredHeadingDelta,
		distanceToDestination,
		proximity,
		lastNPosition,
	} = data;

	positionBuffer.push(position);

	if (positionChart?.chartjs?.data?.datasets?.[0].data) {
		positionChart.chartjs.data.datasets[1].data = positionBuffer.values.map((value) => ({
			x: value.longitude,
			y: value.latitude,
		}));
		positionChart.chartjs.data.datasets[0].data = [{ x: nPosition.longitude, y: nPosition.latitude }];
		positionChart.chartjs.update();
	}

	if (nPositionDeltaChart?.chartjs?.data?.datasets?.[0].data) {
		const distance = lastNPosition.distanceTo(nPosition);
		tempDistanceBuffer.push(distance);
		const maxDistance = Math.max(...tempDistanceBuffer.values);
		nPositionDeltaChart.chartjs.data.datasets[0].data = [lastNPosition.distanceTo(nPosition)];
		nPositionDeltaChart.chartjs.data.datasets[1].data = [maxDistance];
		nPositionDeltaChart.chartjs.update();
	}

	velocityGraph.next({
		velocity,
		nVelocity,
		timeDelta,
	});

	display.next({
		destination: destination,
		proximity: proximity[0] + 'm',
		position: position.latitude + ', ' + position.longitude,
		nPosition: nPosition.latitude + ', ' + nPosition.longitude,
		desiredHeadingDelta: desiredHeadingDelta + ' deg',
		desiredHeading: desiredHeading + ' deg',
		Heading: heading + ' deg',
		nHeading: nHeading + ' deg',
		nVelocity: nVelocity + ' m/s',
		distanceToDestination: distanceToDestination + 'm',
		timeDelta: timeDelta + '',
	});
};
