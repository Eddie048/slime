import { Vector, vCreate } from "./vector";

// Initialize canvas and rendering context with correct width and height
const canvas = <HTMLCanvasElement>document.getElementById("canvas");
canvas.height = document.body.clientHeight;
canvas.width = document.body.clientWidth;

const ctx = <CanvasRenderingContext2D>canvas.getContext("2d");

// Fill screen with black
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Initialize agents
type Agent = {
  position: Vector;
  velocity: Vector;
};

const agentList: Agent[] = [];

for (let i = 0; i < 10; i++) {
  agentList.push({
    position: { x: screen.width / 2, y: screen.height / 2 },
    velocity: vCreate(1, Math.random() * Math.PI * 2),
  });
}

const animationLoop = () => {
  // Recursive
  requestAnimationFrame(animationLoop);

  for (let agent of agentList) {
    // Sense
    // Rotate
    // Move
    // Deposit
  }

  // Diffuse

  // Decay

  // Render
  // Will possibly move render step before decay
};

// Start animation loop
requestAnimationFrame(animationLoop);
