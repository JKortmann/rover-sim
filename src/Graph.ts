import { Buffer } from './Buffer';

const CANVAS_CONTAINER = document.getElementById('canvasContainer') as HTMLDivElement;

export interface CanvasOptions extends Partial<HTMLCanvasElement> {
	width: number;
	height: number;
}

export interface DataEntry {
	label?: string;
	color: string;
	range: [min: number, max: number];
}

type DataEntriesMap = Record<string, DataEntry>;

type InternalEntry = Required<DataEntry & { buffer: Buffer<number> }>;

export class Graph {
	private readonly canvas: HTMLCanvasElement;
	private context: CanvasRenderingContext2D;
	private readonly entries: Record<string, InternalEntry>;
	private readonly yMin: number = 0;
	private readonly yMax: number = 1;

	constructor(canvasOptions: CanvasOptions, entries: DataEntriesMap) {
		this.canvas = document.createElement('canvas');

		Object.entries(canvasOptions).forEach(([key, value]) => {
			// @ts-ignore Just dont set any read-only attributes. It won't work anyway...
			this.canvas[key] = value;
		});

		this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;

		CANVAS_CONTAINER.appendChild(this.canvas);

		this.entries = {};
		this.assignEntries(entries);

		const ranges = Object.values(entries).map(({ range }) => range);
		this.yMin = Math.min(...ranges.map((r) => r[0]));
		this.yMax = Math.max(...ranges.map((r) => r[1]));
	}

	private assignEntries(entries: DataEntriesMap) {
		Object.keys(entries).forEach((key) => {
			this.entries[key] = {
				label: entries[key].label || key,
				buffer: new Buffer<number>(this.canvas.width),
				...entries[key],
			};
		});
	}

	private clearRect() {
		this.context.save();
		this.context.fillStyle = '#000';
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.restore();
	}

	private drawDataEntry(entry: InternalEntry) {
		this.context.save();

		this.context.lineWidth = 1;
		this.context.strokeStyle = entry.color;

		this.context.moveTo(0, this.canvas.height);

		this.context.beginPath();

		entry.buffer.values.forEach((v, i) => {
			const mappedY = this.mapYValueToCanvas(v);

			this.context.lineTo(this.canvas.width - i, this.canvas.height - mappedY);
		});

		this.context.stroke();

		this.context.restore();
	}

	private mapYValueToCanvas(v: number) {
		return (v - this.yMin) * (this.canvas.height / (this.yMax - this.yMin));
	}

	private drawLabels() {
		const margin = 5;
		let start = 5;

		Object.values(this.entries).forEach((entry) => {
			const label = this.drawEntryLabel(entry, { x: start, y: 5 });
			start = start + label.width + margin;
		});
	}

	private drawEntryLabel({ label, color }: InternalEntry, position: { x: number; y: number }) {
		const hPadding = 3;

		this.context.save();

		const textDimensions = this.context.measureText(label);

		const width = textDimensions.width;

		this.context.save();
		this.context.fillStyle = color;
		this.context.fillRect(position.x, position.y, width + 2 * hPadding, 14);
		this.context.restore();

		this.context.font = '12px sans-serif';
		this.context.fillStyle = '#000';
		// Todo: why +11?
		this.context.fillText(label, position.x + hPadding, position.y + 11, width);

		this.context.restore();

		return {
			...textDimensions,
			width: textDimensions.width + 2 * hPadding,
		};
	}

	private drawXAxis() {
		this.context.save();

		const axisEvery = 5;

		const amount = Math.floor(Math.abs(this.yMax - this.yMin) / axisEvery);
		const axes = Array.from(Array(amount).keys()).map((_, i) => {
			return this.yMin - (this.yMin % axisEvery) + i * axisEvery;
		});

		this.context.lineWidth = 1;
		this.context.strokeStyle = '#444';

		axes.forEach((y) => {
			const mappedAxis = this.mapYValueToCanvas(y);

			this.context.beginPath();
			this.context.moveTo(0, this.canvas.height - mappedAxis);
			this.context.lineTo(this.canvas.width, this.canvas.height - mappedAxis);
			this.context.stroke();
		});

		this.context.restore();
	}

	private draw() {
		this.clearRect();

		this.drawXAxis();

		for (const entry of Object.values(this.entries)) {
			this.drawDataEntry(entry);
		}

		this.drawLabels();
	}

	public next(values: Record<keyof DataEntriesMap, number>) {
		for (const [key, entry] of Object.entries(this.entries)) {
			entry.buffer.push(values[key] ?? entry.buffer.latest());
		}

		this.draw();
	}
}
