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
const decayFactor = 20;
const turnSpeed = 0.7;
const numAgents = 100000;
const canvasScale = 1;
const blurMute = 8;

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
    curState: number[],
    width: number,
    height: number,
    decayFactor: number,
    blurMute: number
  ) {
    let nextValue =
      (curState[this.thread.y * width * 4 + this.thread.x * 4] - decayFactor) /
      256;
    if (nextValue != 1 && blurMute < 20) {
      let sum = 0;
      for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
          if (
            this.thread.x + i >= 0 &&
            this.thread.x + j <= width &&
            this.thread.y + i >= 0 &&
            this.thread.y + j <= height
          ) {
            sum +=
              curState[
                (this.thread.y + i) * width * 4 + (this.thread.x + j) * 4
              ] / 256;
          }
        }
      }
      nextValue = (nextValue * blurMute + sum) / (9 + blurMute);
    }
    this.color(nextValue, nextValue, nextValue);
  })
  .setOutput([width, height])
  .setGraphical(true);

const rollingAvg: number[] = new Array(100);
rollingAvg.fill(0);
document.getElementById("canvas")?.replaceWith(decay.canvas);
let prevTime = 1;
var prevRun: number[];
prevRun = <number[]>(<unknown>decay.getPixels(true));
let lastPrint = 0;

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
  if (currentTime - lastPrint > 1000) {
    console.log("Framerate: " + Math.round((sum * 100) / 100) / 100);
    lastPrint = currentTime;
  }

  // Update all agents
  for (let agent of agentList) {
    agent = updateAgent(agent);
  }

  for (let agent of agentList) {
    // Deposit
    prevRun[
      Math.floor(agent.position.y) * width * 4 +
        Math.floor(agent.position.x) * 4
    ] = 256 + decayFactor;
  }

  decay(prevRun, width, height, decayFactor, blurMute);

  prevRun = <number[]>(<unknown>decay.getPixels(true));
};

// Start animation loop
requestAnimationFrame(animationLoop);
