var controls = require("ble_hid_controls");

const OVERFLOW = 0.6;
const THRESHOLD = 0.03;

let lastAngle = 0;
let sendBluetoothCommands = false;

const min = {
  x: 10000,
  y: 10000,
  z: 10000,
};

const range = {
  x: 0,
  y: 0,
  z: 0,
};

const updateMin = (force) => {
  ['x','y','z'].forEach(dimension => {
    min[dimension] = Math.min(min[dimension], force[dimension]); 
  });
};

const updateRange = (force) => {
  ['x','y','z'].forEach(dimension => {
    const currentRange = force[dimension] - min[dimension];

    range[dimension] = Math.max(range[dimension], currentRange);
  });
};

const normalizeForce = force => ({
  x: ((force.x - min.x) / range.x) - 0.5,
  y: ((force.y - min.y) / range.y) - 0.5,
  z: ((force.z - min.z) / range.z) - 0.5,
});

const calculatePlanarAngle = force => (Math.atan2(force.y,force.x) + Math.PI) / (2 * Math.PI);

NRF.setServices(undefined, { hid : controls.report });

Puck.magOn(10);
Puck.on('mag', force => {
  updateMin(force);
  updateRange(force);
  const normalizedForce = normalizeForce(force);

  const angle = calculatePlanarAngle(normalizedForce);

  let difference = angle - lastAngle;

  if (difference > OVERFLOW) {
    difference -= 1;
  }

  if (difference < -OVERFLOW) {
    difference += 1;
  }

  if (sendBluetoothCommands) {
    if (difference > THRESHOLD && difference < OVERFLOW) {
      console.log('volume up');
      controls.volumeUp();
    }

    if (difference < -THRESHOLD && difference > -OVERFLOW) {
      console.log('volume down');
      controls.volumeDown();
    }
  }

  lastAngle = angle;
});

setWatch(
  () => {
    if (sendBluetoothCommands) {
      sendBluetoothCommands = false;
    } else {
      sendBluetoothCommands = true;
    }
    console.log('Toggled sending commands', sendBluetoothCommands);
  },
  BTN,
  { repeat: true, edge: 'rising', debounce: 10 }
);