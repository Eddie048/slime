import { GPU } from "gpu.js";

function getIndex(x: number, y: number, width: number, height: number) {
  let xTemp = x;
  let yTemp = y;

  if (xTemp < 0) xTemp += width;
  else if (xTemp > width) xTemp -= width;
  if (yTemp < 0) yTemp += height;
  else if (yTemp > height) yTemp -= height;

  return (yTemp * width + xTemp) * 4;
}

// GPU Function to decay pixels
const gpu1 = new GPU();
const decay = gpu1
  .createKernel(function (
    curState: number[],
    width: number,
    height: number,
    decayFactor: number,
    blurMute: number
  ) {
    let nextValue =
      curState[getIndex(this.thread.x, this.thread.y, width, height)];
    if (nextValue < 255 && blurMute > 0) {
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
              ];
          }
        }
      }
      nextValue += blurMute * (sum / 9 - nextValue);
    }
    nextValue = (nextValue - decayFactor) / 255;
    this.color(nextValue, nextValue, nextValue);
  })
  .setFunctions([getIndex])
  .setGraphical(true);

const gpu2 = new GPU();
const updateAgents = gpu2
  .createKernel(function (
    curState: number[],
    agentList: number[],
    senseAngle: number,
    senseDistance: number,
    sensorSize: number,
    randomTurnStrength: number,
    turnSpeed: number,
    agentSpeed: number,
    width: number,
    height: number
  ) {
    if (this.thread.x % 3 == 0) {
      let agentXTemp =
        agentList[this.thread.x] +
        Math.cos(agentList[this.thread.x + 2]) * agentSpeed;
      // Ensure agent stays in bounds, wrap around borders
      if (agentXTemp < 0) agentXTemp += width;
      else if (agentXTemp >= width) agentXTemp -= width;
      return agentXTemp;
    } else if (this.thread.x % 3 == 1) {
      let agentYTemp =
        agentList[this.thread.x] +
        Math.sin(agentList[this.thread.x + 1]) * agentSpeed;
      // Ensure agent stays in bounds, wrap around borders
      if (agentYTemp < 0) agentYTemp += height;
      else if (agentYTemp >= height) agentYTemp -= height;
      return agentYTemp;
    } else {
      const agentX = agentList[this.thread.x - 2];
      const agentY = agentList[this.thread.x - 1];
      const agentDir = agentList[this.thread.x];
      // Sense
      const senseLeftX = Math.floor(
        Math.cos(agentDir - senseAngle) * senseDistance + agentX
      );
      const senseLeftY = Math.floor(
        Math.sin(agentDir - senseAngle) * senseDistance + agentY
      );
      const senseRightX = Math.floor(
        Math.cos(agentDir + senseAngle) * senseDistance + agentX
      );
      const senseRightY = Math.floor(
        Math.sin(agentDir + senseAngle) * senseDistance + agentY
      );
      const senseForwardX = Math.floor(
        Math.cos(agentDir) * senseDistance + agentX
      );
      const senseForwardY = Math.floor(
        Math.sin(agentDir) * senseDistance + agentY
      );

      // Get value, if index is out of bounds avoid it
      let sumL = 0;
      let sumR = 0;
      let sumF = 0;
      const from = Math.floor(sensorSize / 2);
      const to = Math.ceil(sensorSize / 2);
      for (let i = -from; i < to; i++) {
        for (let k = -from; k < to; k++) {
          sumL +=
            curState[
              getIndex(senseLeftX + i, senseLeftY + k, width, height) + 1
            ];
          sumR +=
            curState[
              getIndex(senseRightX + i, senseRightY + k, width, height) + 1
            ];
          sumF +=
            curState[
              getIndex(senseForwardX + i, senseForwardY + k, width, height) + 1
            ];
        }
      }
      // Rotate
      const turnStrength =
        1 - randomTurnStrength + randomTurnStrength * Math.random();
      if (sumF >= sumL && sumF >= sumR) {
        // Don't change direction
        return agentDir;
      } else if (sumF < sumL && sumF < sumR) {
        // Change direction randomly
        return (
          agentDir + turnStrength * turnSpeed * (Math.random() > 0.5 ? 1 : -1)
        );
      } else if (sumL > sumR) {
        // Turn left
        return agentDir - turnSpeed * turnStrength;
      } else {
        // Turn right
        return agentDir + turnSpeed * turnStrength;
      }
    }
  })
  .setFunctions([getIndex])
  .setPipeline(true);

export { decay, updateAgents };
