import { Vector, vAdd, vCreate } from "./vector";

// Options
const agentVelocity = 1;
const decayFactor = -30;

// Initialize canvas and rendering context with correct width and height
const canvas = <HTMLCanvasElement>document.getElementById("canvas");
// canvas.height = document.body.clientHeight;
// canvas.width = document.body.clientWidth;

canvas.height = 100;
canvas.width = 150;

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

for (let i = 0; i < 5; i++) {
  agentList.push({
    position: { x: canvas.width / 2, y: canvas.height / 2 },
    velocity: vCreate(1, Math.random() * Math.PI * 2),
  });
}

const animationLoop = () => {
  const curState = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let agent of agentList) {
    // Sense
    // Rotate
    // Move
    agent.position = vAdd(agent.position, agent.velocity);
    // Ensure agent stays in bounds, bounces off walls
    if (agent.position.x < 0) {
      agent.velocity.x *= -1;
      agent.position.x = 0;
    }
    if (agent.position.x >= canvas.width - 1) {
      agent.velocity.x *= -1;
      agent.position.x = canvas.width - 2;
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
        curState.data[y * 4 * canvas.width + x * 4 + 3] + 1,
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
