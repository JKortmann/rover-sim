import { CanvasOptions } from './Graph';
import ChartJS, { ChartConfiguration } from 'chart.js';

const CANVAS_CONTAINER = document.getElementById('canvasContainer') as HTMLDivElement;

export class Chart {
	private readonly canvas: HTMLCanvasElement;
	private context: CanvasRenderingContext2D;
	public chartjs: ChartJS;

	constructor(canvasOptions: CanvasOptions, chartOptions: ChartConfiguration) {
		console.log(canvasOptions);
		this.canvas = document.createElement('canvas');

		Object.entries(canvasOptions).forEach(([key, value]) => {
			// @ts-ignore Just dont set any read-only attributes. It won't work anyway...
			this.canvas[key] = value;
		});

		this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;

		CANVAS_CONTAINER.appendChild(this.canvas);

		this.chartjs = new ChartJS(this.context, chartOptions);
	}
}
