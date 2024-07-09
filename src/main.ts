import { GPU } from "gpu.js";
import {
  Vector,
  vAdd,
  vCreate,
  vMultiplyScalar,
  vNormalize,
  vRotateByAngle,
} from "./vector";

// World options
const numAgents = 100000; // Total number of agents in the world
const canvasScale = 1; // Scale of the canvas in canvas pixels per screen pixel
const decayFactor = 30; // Value from 0 to 255, how much of a pixel's color fades every frame
const blurMute = 3; // Value from 1 to 20, higher values mute blur, >21 turns blur off

// Agent Options
const senseDistance = 30; // Distance of sensors from the front of the agent
const senseAngle = 1; // Angle in radians of side sensors from front sensor
const turnSpeed = 0.3; // Angle in radians of max turn
const randomTurnStrength = 1.0; // Value from 0 to 1 that controls what percent of the turn is random
const agentSpeed = 1; // Velocity of agents
// Normalize sensor distance
const sensorMultiplier = senseDistance / agentSpeed;

// Initialize canvas and rendering context
const height = Math.floor(document.body.clientHeight / canvasScale);
const width = Math.floor(document.body.clientWidth / canvasScale);

// Initialize agents inside a circle with random position facing towards the center
type Agent = {
  position: Vector;
  velocity: Vector;
};

const agentList: Agent[] = [];
const radius = Math.min(height / 2, width / 2);
for (let i = 0; i < numAgents; i++) {
  const p: Vector = vCreate(
    Math.sqrt(Math.random()) * radius,
    Math.random() * 2 * Math.PI
  );
  const center: Vector = {
    x: width / 2,
    y: height / 2,
  };
  agentList.push({
    position: vAdd(p, center),
    velocity: vMultiplyScalar(vNormalize(p), -agentSpeed),
  });
}

const getBrightness = (location: Vector) => {
  if (
    location.x < 0 ||
    location.x > width ||
    location.y < 0 ||
    location.y > height
  )
    return -1;
  else
    return prevRun[
      Math.floor(location.y) * width * 4 + Math.floor(location.x) * 4 + 1
    ];
};

const updateAgent = (agent: Agent): Agent => {
  // Sense
  const temp = vMultiplyScalar(agent.velocity, sensorMultiplier);

  const turnStrength =
    1 - randomTurnStrength + randomTurnStrength * Math.random();

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
      turnStrength * turnSpeed * (Math.random() > 0.5 ? 1 : -1)
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
    let nextValue = curState[this.thread.y * width * 4 + this.thread.x * 4];
    nextValue = nextValue == 254 ? 255 : nextValue - decayFactor;
    if (nextValue == 254) nextValue = 253;
    nextValue /= 255;
    if (nextValue < 1 && blurMute < 20) {
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
              ] / 255;
          }
        }
      }
      nextValue = (nextValue * blurMute + sum) / (9 + blurMute);
    }
    this.color(nextValue, nextValue, nextValue);
  })
  .setOutput([width, height])
  .setGraphical(true);

// Variables for printing framerate
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
    ] = 254;
  }

  decay(prevRun, width, height, decayFactor, blurMute);

  prevRun = <number[]>(<unknown>decay.getPixels(true));
};

// Start animation loop
requestAnimationFrame(animationLoop);
