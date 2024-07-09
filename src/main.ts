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
const senseDistance = 10;
const senseAngle = 1.2;
const decayFactor = 20;
const turnSpeed = 0.7;
const numAgents = 100000;
const canvasScale = 1;

// Initialize canvas and rendering context
const height = document.body.clientHeight / canvasScale;
const width = document.body.clientWidth / canvasScale;

// Initialize agents inside a circle with random position facing towards the center
type Agent = {
  position: Vector;
  velocity: Vector;
};

const agentList: Agent[] = [];

for (let i = 0; i < numAgents; i++) {
  const p: Vector = vCreate(Math.random() * 200, Math.random() * 2 * Math.PI);
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
  ] = 1;
}

const getBrightness = (location: Vector) => {
  if (
    location.x < 0 ||
    location.x > width ||
    location.y < 0 ||
    location.y > height
  )
    return 0;
  else return agentLocations[Math.floor(location.x)][Math.floor(location.y)];
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
  if (forewardVal <= leftVal && forewardVal <= rightVal) {
  } else if (forewardVal > leftVal && forewardVal > rightVal) {
    agent.velocity = vRotateByAngle(
      agent.velocity,
      (turnStrength - 0.5) * 2 * turnSpeed
    );
  } else if (leftVal < rightVal) {
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
  .createKernel(function (agentLocations: number[][]) {
    let nextValue = 0;
    if (agentLocations[this.thread.y][this.thread.x] == 1) nextValue = 255;
    nextValue /= 256;
    this.color(nextValue, nextValue, nextValue);
  })
  .setOutput([width, height])
  .setGraphical(true);

const rollingAvg: number[] = [];
for (let i = 0; i < 20; i++) {
  rollingAvg.push(0);
}

let prevTime = 1;

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
  console.log("Framerate: " + Math.round((sum * 100) / 20) / 100);

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

  decay(agentLocations);
  // Render
  // ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById("canvas")?.replaceWith(decay.canvas);
  // canvas = decay.canvas;
  // ctx = <CanvasRenderingContext2D>(
  //   canvas.getContext("2d", { willReadFrequently: true })
  // );
  console.log(decay.canvas);

  const test = <HTMLCanvasElement>document.getElementsByTagName("canvas")[0];
  console.log(test.getContext("2d"));
};

// Start animation loop
requestAnimationFrame(animationLoop);
