import { GPU } from "gpu.js";
import {
  Vector,
  vAdd,
  vCreate,
  vMultiplyScalar,
  vNormalize,
  vRotateByAngle,
} from "./vector";

// Options
const agentVelocity = 1;
const senseDistance = 15;
const senseAngle = 1.2;
const decayFactor = 10;
const turnSpeed = 1;
const numAgents = 100000;
const canvasScale = 1;

// Initialize canvas and rendering context
const height = Math.floor(document.body.clientHeight / canvasScale);
const width = Math.floor(document.body.clientWidth / canvasScale);

// Initialize agents inside a circle with random position facing towards the center
type Agent = {
  position: Vector;
  velocity: Vector;
};

const agentList: Agent[] = [];

for (let i = 0; i < numAgents; i++) {
  const p: Vector = vCreate(
    Math.random() * Math.min(200, width / 2),
    Math.random() * 2 * Math.PI
  );
  const center: Vector = {
    x: width / 2,
    y: height / 2,
  };
  agentList.push({
    position: vAdd(p, center),
    velocity: vMultiplyScalar(vNormalize(p), -agentVelocity),
  });
}

const agentLocations: number[][] = new Array();
for (let i = 0; i < height; i++) {
  agentLocations.push(new Array(width).fill(0));
}
for (let agent of agentList) {
  // Deposit
  agentLocations[Math.floor(agent.position.y)][
    Math.floor(agent.position.x)
  ] = 255;
}

const getBrightness = (location: Vector) => {
  if (
    location.x < 0 ||
    location.x > width ||
    location.y < 0 ||
    location.y > height
  )
    return 0;
  else
    return prevRun[
      Math.floor(location.y) * width * 4 + Math.floor(location.x) * 4 + 1
    ];
};

const updateAgent = (agent: Agent): Agent => {
  // Sense
  const temp = vMultiplyScalar(agent.velocity, senseDistance);

  const turnStrength = Math.random();

  // Get index of data to sense
  let leftSenseVector = vAdd(vRotateByAngle(temp, -senseAngle), agent.position);
  let forewardSenseVector = vAdd(temp, agent.position);
  let rightSenseVector = vAdd(vRotateByAngle(temp, senseAngle), agent.position);

  // Get value, if index is out of bounds avoid it
  const leftVal = getBrightness(leftSenseVector);
  const forewardVal = getBrightness(forewardSenseVector);
  const rightVal = getBrightness(rightSenseVector);

  // Rotate
  if (forewardVal >= leftVal && forewardVal >= rightVal) {
  } else if (forewardVal < leftVal && forewardVal < rightVal) {
    agent.velocity = vRotateByAngle(
      agent.velocity,
      (turnStrength - 0.5) * 2 * turnSpeed
    );
  } else if (leftVal > rightVal) {
    agent.velocity = vRotateByAngle(agent.velocity, -turnSpeed * turnStrength);
  } else {
    agent.velocity = vRotateByAngle(agent.velocity, turnSpeed * turnStrength);
  }

  // Move
  agent.position = vAdd(agent.position, agent.velocity);
  // Ensure agent stays in bounds, wrap around borders
  if (agent.position.x < 0) {
    agent.position.x += width;
  }
  if (agent.position.x >= width) {
    agent.position.x -= width;
  }
  if (agent.position.y < 0) {
    agent.position.y += height;
  }
  if (agent.position.y >= height) {
    agent.position.y -= height;
  }

  return agent;
};

// GPU Function to decay pixels
const gpu = new GPU();
const decay = gpu
  .createKernel(function (
    agentLocations: number[][],
    curState: number[],
    width: number,
    decayFactor: number
  ) {
    let nextValue =
      (curState[this.thread.y * width * 4 + this.thread.x * 4] - decayFactor) /
      256;

    if (agentLocations[this.thread.y][this.thread.x] == 1) nextValue = 1;

    this.color(nextValue, nextValue, nextValue);
  })
  .setOutput([width, height])
  .setGraphical(true);

const rollingAvg: number[] = [];
for (let i = 0; i < 10; i++) {
  rollingAvg.push(0);
}
document.getElementById("canvas")?.replaceWith(decay.canvas);
let prevTime = 1;
var prevRun;
prevRun = decay.getPixels(true);

const animationLoop = (currentTime: number) => {
  requestAnimationFrame(animationLoop);
  // Print framerate
  const deltaTime = Math.min(1, (currentTime - prevTime) / 1000);
  prevTime = currentTime;
  const curFrameRate = Math.round(100 / deltaTime) / 100;
  rollingAvg.shift();
  rollingAvg.push(curFrameRate);
  let sum = 0;
  for (let num of rollingAvg) {
    sum += num;
  }
  console.log("Framerate: " + Math.round((sum * 100) / 10) / 100);

  // Update all agents
  for (let agent of agentList) {
    agent = updateAgent(agent);
  }

  // TODO: Diffuse
  for (let i = 0; i < height; i++) {
    agentLocations[i].fill(0);
  }
  for (let agent of agentList) {
    // Deposit
    agentLocations[Math.floor(agent.position.y)][
      Math.floor(agent.position.x)
    ] = 1;
  }

  // console.log(decay.getPixels());
  // console.log(
  //   decay.getPixels()[(height / 2) * 4 * width + (width * 4) / 2 + 3]
  // );
  if (prevRun == null) prevRun = decay.getPixels(true);
  decay(agentLocations, prevRun, width, decayFactor);
  // decay(agentLocations, prevRun, width, decayFactor);
  // console.log(
  //   decay.getPixels()[(height / 2) * 4 * width + (width * 4) / 2 + 3]
  // );
  // decay(agentLocations, decay.getPixels(true), width, decayFactor);
  // console.log(
  //   decay.getPixels()[(height / 2) * 4 * width + (width * 4) / 2 + 3]
  // );
  prevRun = decay.getPixels(true);
};

// Start animation loop
requestAnimationFrame(animationLoop);
