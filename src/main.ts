import { Texture } from "gpu.js";
import { decay, updateAgents } from "./gpu-util";

// World options
const numAgents = 100000; // Total number of agents in the world
const canvasScale = 1; // Scale of the canvas in canvas pixels per screen pixel
const decayFactor = 8; // Value from 0 to 255, how much of a pixel's color fades every frame
const blurMute = 0.4; // Value from 1 to 20, higher values mute blur, >21 turns blur off

// Agent Options
const senseDistance = 30; // Distance of sensors from the front of the agent
const senseAngle = 0.8; // Angle in radians of side sensors from front sensor
const sensorSize = 2; // Width, in pixels, of sensor
const turnSpeed = 0.4; // Angle in radians of max turn
const randomTurnStrength = 0; // Value from 0 to 1 that controls what percent of the turn is random
const agentSpeed = 1; // Velocity of agents

// Initialize canvas and rendering context
const height = Math.floor(document.body.clientHeight / canvasScale);
const width = Math.floor(document.body.clientWidth / canvasScale);

// Initialize agents inside a circle with random position facing towards the center
// Agents are stored as 3 consecutive numbers, posX, posY, and rotation
const agentListTemp: number[] = new Array(numAgents * 3);
const radius = Math.min(height / 2, width / 2);
const xStart = Math.max(width - height, 0) / 2;
const yStart = Math.max(height - width, 0) / 2;

for (let i = 0; i < numAgents; i++) {
  const posX = Math.random() * radius * 2 + xStart;
  const posY = Math.random() * radius * 2 + yStart;

  // If position is not within a circle, try again
  if (
    Math.sqrt(
      Math.pow(posX - (xStart + radius), 2) +
        Math.pow(posY - (yStart + radius), 2)
    ) > radius
  ) {
    i--;
    continue;
  }

  const centerDir =
    Math.atan((yStart + radius - posY) / (xStart + radius - posX)) +
    (posX > xStart + radius ? Math.PI : 0);

  agentListTemp[i * 3] = posX;
  agentListTemp[i * 3 + 1] = posY;
  agentListTemp[i * 3 + 2] = centerDir;
}

// Variables for printing framerate
const rollingAvg: number[] = new Array(100);
rollingAvg.fill(0);
let prevTime = 1;
let lastPrint = 0;

// Set up canvas with GPU functions
decay.setOutput([width, height]);
updateAgents.setOutput([numAgents * 3]);
updateAgents.setImmutable(true);
document.getElementById("canvas")?.replaceWith(decay.canvas);
let prevRun: number[] = <number[]>(<unknown>decay.getPixels(true)); // Unknown conversion because creating a new array is slow
let agentList: Texture = <Texture>(
  updateAgents(
    prevRun,
    agentListTemp,
    senseAngle,
    senseDistance,
    sensorSize,
    randomTurnStrength,
    turnSpeed,
    agentSpeed,
    width,
    height
  )
);

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

  agentList = updateAgents(
    prevRun,
    agentList,
    senseAngle,
    senseDistance,
    sensorSize,
    randomTurnStrength,
    turnSpeed,
    agentSpeed,
    width,
    height
  ) as Texture;

  // Update all agents
  const temp = <number[]>agentList.toArray();
  for (let i = 0; i < numAgents; i++) {
    // Deposit;
    prevRun[
      Math.floor(temp[i * 3 + 1]) * width * 4 + Math.floor(temp[i * 3]) * 4
    ] = 255;
  }

  decay(prevRun, width, height, decayFactor, blurMute);

  prevRun = <number[]>(<unknown>decay.getPixels(true)); // Unknown conversion because creating a new array is slow
};

// Start animation loop
requestAnimationFrame(animationLoop);
