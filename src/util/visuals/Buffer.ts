type BufferCallback<T> = (values: T[]) => unknown;

export class Buffer<T> {
	size: number;
	values: T[] = [];

	private subscribers: Array<BufferCallback<T>> = [];

	constructor(size: number) {
		this.size = size;
	}

	push(value: T) {
		if (this.values.unshift(value) > this.size) {
			this.values.length = this.size;
		}

		this.notify();
	}

	subscribe(cb: BufferCallback<T>) {
		this.subscribers.push(cb);
	}

	private notify() {
		this.subscribers.forEach((sub) => sub(this.values));
	}

	previous() {
		return this.values[1];
	}

	latest() {
		return this.values[0];
	}

	item(index: number) {
		if (index < 0) {
			return this.values[this.values.length - index];
		} else {
			return this.values[index];
		}
	}
}
