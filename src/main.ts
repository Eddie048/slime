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
const senseAngle = 1;
const decayFactor = 30;
const turnSpeed = 0.7;
const numAgents = 100000;
const canvasScale = 2;

// Initialize canvas and rendering context
const canvas = <HTMLCanvasElement>document.getElementById("canvas");
canvas.height = document.body.clientHeight / canvasScale;
canvas.width = document.body.clientWidth / canvasScale;

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
  const p: Vector = vCreate(Math.random() * 200, Math.random() * 2 * Math.PI);
  const center: Vector = {
    x: -canvas.width / 2,
    y: -canvas.height / 2,
  };
  agentList.push({
    position: vAdd(p, center),
    velocity: vMultiplyScalar(vNormalize(p), -agentVelocity),
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
    const temp = vMultiplyScalar(agent.velocity, senseDistance);

    // const turnStrength = Math.random();

    const leftSense = vAdd(vRotateByAngle(temp, -senseAngle), agent.position);
    const forewardSense = vAdd(temp, agent.position);
    const rightSense = vAdd(vRotateByAngle(temp, senseAngle), agent.position);
    const leftVal = 255 - getVal(leftSense.x, leftSense.y);
    const forewardVal = 255 - getVal(forewardSense.x, forewardSense.y);
    const rightVal = 255 - getVal(rightSense.x, rightSense.y);

    // Rotate
    // if (forewardVal <= leftVal && forewardVal <= rightVal) {
    // } else if (leftVal < rightVal) {
    //   agent.velocity = vRotateByAngle(
    //     agent.velocity,
    //     -turnSpeed * turnStrength
    //   );
    // } else if (rightVal > leftVal) {
    //   agent.velocity = vRotateByAngle(agent.velocity, turnSpeed * turnStrength);
    // } else {
    //   agent.velocity = vRotateByAngle(
    //     agent.velocity,
    //     (turnStrength - 0.5) * 2 * turnSpeed
    //   );
    // }
    const sum = leftVal + rightVal + forewardVal;
    const choice = Math.random();
    if (choice < leftVal / sum)
      agent.velocity = vRotateByAngle(agent.velocity, -turnSpeed);
    else if (choice > (leftVal + forewardVal) / sum)
      agent.velocity = vRotateByAngle(agent.velocity, turnSpeed);
    // agent.velocity = vRotateByAngle(
    //   agent.velocity,
    //   ((leftVal - rightVal) / sum) * turnSpeed
    // );

    // Move
    agent.position = vAdd(agent.position, agent.velocity);
    // Ensure agent stays in bounds, bounces off walls
    if (agent.position.x < 0) {
      // agent.velocity.x *= -1;
      // agent.position.x = 0;
      agent.position.x += canvas.width;
    }
    if (agent.position.x >= canvas.width - 1) {
      // agent.velocity.x *= -1;
      // agent.position.x = canvas.width - 1;
      agent.position.x -= canvas.width;
    }
    if (agent.position.y < 0) {
      // agent.velocity.y *= -1;
      // agent.position.y = 0;
      agent.position.y += canvas.height;
    }
    if (agent.position.y >= canvas.height) {
      // agent.velocity.y *= -1;
      // agent.position.y = canvas.height - 1;
      agent.position.y -= canvas.height;
    }
  }

  // Decay
  const nextState = ctx.createImageData(curState);
  for (let x = 0; x < canvas.width; x++) {
    for (let y = 0; y < canvas.height; y++) {
      nextState.data[y * 4 * canvas.width + x * 4 + 3] = Math.max(
        getVal(x, y) + decayFactor,
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
