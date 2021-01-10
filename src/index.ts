import { ControlLoop, Simulation } from 'rover';
import LatLon from 'geodesy/latlon-spherical'
import LatLonSpherical from "geodesy/latlon-spherical";
import {SensorValues} from "rover";
import {Buffer} from './Buffer';
import {harmonicMean, clamp, signedAngleDifference, getEngineForceToTravelDistance, turnVehicle} from './utils';
import {Graph} from './Graph';
import LatLong from "geodesy/latlon-spherical";


const destinations = [
  {
    latitude: 52.47880703639255,
    longitude: 13.395281227289209,
    label: "A",
  },
  {
    latitude: 52.47880703639255,
    longitude: 13.395681227289209,
    label: "B",
  },
];

let simulation: Simulation | null;

const controlValues = {
  forward: 0,
  backward: 0,
  left: 0,
  right: 0,
};

let iteration = 0;
const sensorDataBuffer = new Buffer<SensorValues>(5);

const velocityBuffer = new Buffer<number>(5);
const accelerationBuffer = new Buffer<number>(5);
const orientationBuffer = new Buffer<number>(5);

sensorDataBuffer.subscribe((values) => {
  const curr = values[0];
  const prev = values[1] as SensorValues | undefined; // We know, that for a single tick the buffer only contains a single item

  const timeDelta = curr.clock - (prev?.clock || 0);

  const position = new LatLon(curr.location.latitude, curr.location.longitude);
  const lastPosition = prev ? new LatLon(prev.location.latitude, prev.location.longitude) : position;
  const positionDelta = position.distanceTo(lastPosition);

  const velocity = positionDelta / (timeDelta / 1000) // in m/s
  const lastVelocity = velocityBuffer.item(0) || velocity;
  const velocityDelta = velocity - lastVelocity;

  const acceleration = velocityDelta / timeDelta;

  velocityBuffer.push(velocity);
  accelerationBuffer.push(acceleration);
  orientationBuffer.push(curr.heading);
});

// Prefix "n" for normalized
let nVelocity = 0;
velocityBuffer.subscribe((values) => {
  nVelocity = harmonicMean(values)
})

let nAcceleration = 0;
accelerationBuffer.subscribe(values => {
  nAcceleration = harmonicMean(values)
})

let nOrientation = 0;
orientationBuffer.subscribe(values => {
  nOrientation = harmonicMean(values)
})

let lastClock = 0;
let lastPosition: LatLonSpherical | null = null;

const velocityGraph = new Graph(
  {id: 'velocity', width: 800, height: 100},
  {
    velocity: {
      color: '#ff0',
      range: [0, 30],
    },
    nVelocity: {
      color: '#f0f',
      range: [0, 30],
    },
    timeDelta: {
      color: '#0ff',
      range: [10, 30],
    }
  }
);

let currentDestinationIndex = 0;

const loop: ControlLoop = (sensorData, {engines}) => {
  sensorDataBuffer.push(sensorData);
  const {location: {latitude, longitude}, heading, clock} = sensorData
  const timeDelta = clock - lastClock

  engines = [0, 0]

  const currentDestination = destinations[currentDestinationIndex];
  const destinationPosition = new LatLong(currentDestination.latitude, currentDestination.longitude);
  const position = new LatLon(latitude, longitude)
  const distanceToDestination = position.distanceTo(destinationPosition);

  const desiredOrientation = 360 - position.initialBearingTo(destinationPosition);
  const desiredOrientationDelta = signedAngleDifference(heading, desiredOrientation);

  if (Math.round(distanceToDestination) > 0) {
    engines = engines.map(() => getEngineForceToTravelDistance(distanceToDestination, nVelocity));
  }

  if (Math.round(desiredOrientationDelta) !== 0) {
    engines = turnVehicle(desiredOrientationDelta)
  }

  if (Math.round(nVelocity) === 0 && Math.floor(distanceToDestination) === 0) {
    if (currentDestinationIndex < destinations.length - 1) {
      currentDestinationIndex++;
      console.log("Reached Destination");
    } else {
      console.log("Done with all stops");
    }
  }

  // If any steering overrides are happening
  if (Object.values(controlValues).some(v => v !== 0)) {
    engines = [0, 0]

    engines[0] += controlValues.forward
    engines[1] += controlValues.forward

    engines[0] -= controlValues.backward
    engines[1] -= controlValues.backward

    engines[0] -= controlValues.left
    engines[1] += controlValues.left

    engines[0] += controlValues.right
    engines[1] -= controlValues.right

    engines = engines.map(v => clamp(v, -1, 1))
  }

  lastClock = clock;
  lastPosition = position;
  iteration++;

  velocityGraph.next({velocity: velocityBuffer.latest(), nVelocity, timeDelta})

  return {
    engines,
    debug: {
      desiredOrientationDelta: desiredOrientationDelta + " deg",
      desiredOrientation: desiredOrientation + " deg",
      orientation: heading + " deg",
      nVelocity: nVelocity + ' m/s',
      nAcceleration: nAcceleration * 100 + ' cm/s^2',
      distanceToDestination: distanceToDestination + 'm',
      controlValues: JSON.stringify(controlValues),
      engines: JSON.stringify(engines),
      timeDelta: timeDelta + '',
      destination: destinations[currentDestinationIndex].label,
    }
  }
}
simulation = new Simulation({
  loop,
  origin: {
    latitude:52.477050353132384,
    longitude:13.395281227289209
  },
  element: document.querySelector('main') as HTMLElement,
  locationsOfInterest: destinations,
  renderingOptions: {
    width: 800,
    height: 800,
  },
});

simulation.start();


const controlMapping: Record<keyof typeof controlValues, string[]> = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
}
window.addEventListener('keydown', (e) => {
  Object.entries(controlMapping).forEach(([key, codes]) => {
    if (codes.includes(e.code)) {
      controlValues[key as keyof typeof controlValues] = 1
    }
  })
})
window.addEventListener('keyup', (e) => {
  Object.entries(controlMapping).forEach(([key, codes]) => {
    if (codes.includes(e.code)) {
      controlValues[key as keyof typeof controlValues] = 0
    }
  })
})
