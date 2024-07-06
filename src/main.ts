import {
  Vector,
  vAdd,
  vCreate,
  vMultiplyScalar,
  vRotateByAngle,
} from "./vector";

// Options
const agentVelocity = 1;
const senseMultiple = 10;
const decayFactor = 3;
const turnAngle = 0.6;
const numAgents = 10000;

// Initialize canvas and rendering context
const canvas = <HTMLCanvasElement>document.getElementById("canvas");
// canvas.height = document.body.clientHeight;
// canvas.width = document.body.clientWidth;

canvas.height = 450;
canvas.width = 720;

const ctx = <CanvasRenderingContext2D>(
  canvas.getContext("2d", { willReadFrequently: true })
);

// Fill screen with black
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Initialize agents
type Agent = {
  position: Vector;
  velocity: Vector;
};

const agentList: Agent[] = [];

for (let i = 0; i < numAgents; i++) {
  agentList.push({
    position: { x: canvas.width / 2, y: canvas.height / 2 },
    velocity: vCreate(agentVelocity, Math.random() * Math.PI * 2),
  });
}

// Initialize current state of image
let curState = ctx.getImageData(0, 0, canvas.width, canvas.height);

const getVal = (x: number, y: number) => {
  if (x < 0 || x > canvas.width - 1 || y < 0 || y > canvas.height - 1)
    return 256;
  return curState.data[
    Math.round(y) * 4 * canvas.width + Math.round(x) * 4 + 3
  ];
};

const animationLoop = () => {
  curState = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let agent of agentList) {
    // Sense
    const temp = vMultiplyScalar(agent.velocity, senseMultiple);

    const leftSense = vAdd(vRotateByAngle(temp, -turnAngle), agent.position);
    const forewardSense = vAdd(temp, agent.position);
    const rightSense = vAdd(vRotateByAngle(temp, turnAngle), agent.position);
    const leftVal = getVal(leftSense.x, leftSense.y);
    const forewardVal = getVal(forewardSense.x, forewardSense.y);
    const rightVal = getVal(rightSense.x, rightSense.y);

    // Rotate
    if (forewardVal <= leftVal && forewardVal <= rightVal) {
    } else if (forewardVal > leftVal && forewardVal > rightVal) {
      agent.velocity = vRotateByAngle(
        agent.velocity,
        Math.random() * 2 * turnAngle - turnAngle
      );
    } else if (leftVal < rightVal) {
      agent.velocity = vRotateByAngle(agent.velocity, -turnAngle);
    } else {
      agent.velocity = vRotateByAngle(agent.velocity, turnAngle);
    }

    // Move
    agent.position = vAdd(agent.position, agent.velocity);
    // Ensure agent stays in bounds, bounces off walls
    if (agent.position.x < 0) {
      agent.velocity.x *= -1;
      agent.position.x = 0;
    }
    if (agent.position.x >= canvas.width - 1) {
      agent.velocity.x *= -1;
      agent.position.x = canvas.width - 1;
    }
    if (agent.position.y < 0) {
      agent.velocity.y *= -1;
      agent.position.y = 0;
    }
    if (agent.position.y >= canvas.height) {
      agent.velocity.y *= -1;
      agent.position.y = canvas.height - 1;
    }
  }

  // Decay
  const nextState = ctx.createImageData(curState);
  for (let x = 0; x < canvas.width; x++) {
    for (let y = 0; y < canvas.height; y++) {
      nextState.data[y * 4 * canvas.width + x * 4 + 3] = Math.max(
        curState.data[y * 4 * canvas.width + x * 4 + 3] + decayFactor,
        0
      );
    }
  }

  // TODO: Diffuse

  for (let agent of agentList) {
    // Deposit
    nextState.data[
      Math.round(agent.position.y) * 4 * canvas.width +
        Math.round(agent.position.x) * 4 +
        3
    ] = 0;
  }

  // Render
  // Will possibly move render step before decay
  ctx.putImageData(nextState, 0, 0);

  requestAnimationFrame(animationLoop);
};

// Start animation loop
requestAnimationFrame(animationLoop);
