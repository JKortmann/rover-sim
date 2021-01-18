const DISPLAY_CONTAINER = document.getElementById('displayContainer') as HTMLDivElement

export interface CanvasOptions extends Partial<HTMLCanvasElement> {
    width: number,
    height: number,
}

export class Display {
    private readonly canvas: HTMLCanvasElement
    private context: CanvasRenderingContext2D

    private values: Record<string, unknown>

    constructor(canvasOptions: CanvasOptions) {
        this.canvas = document.createElement('canvas')

        Object.entries(canvasOptions).forEach(([key, value]) => {
            // @ts-ignore Just dont set any read-only attributes. It won't work anyway...
            this.canvas[key] = value;
        })

        this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D

        DISPLAY_CONTAINER.appendChild(this.canvas);

        this.values = {};
        this.draw();
    }

    private clearRect() {
        this.context.save();
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.restore();
    }

    private draw() {
        this.context.save();

        this.clearRect();

        // Draw debug values to top left corner
        this.context.font = '12px monospace';
        this.context.fillStyle = 'white';
        Object.entries(this.values).forEach(([key, value], index) => {
            value = JSON.stringify(value);
            this.context.fillText(`${key}: ${value}`, 10, 15 + (index * 14))
        })

        this.context.restore();
    }

    next(values: Record<string, unknown>) {
        this.values = values;
        this.draw();
    }
}
