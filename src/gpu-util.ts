import { GPU } from "gpu.js";

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
    if (this.thread.x == 10 && this.thread.y == 10) {
      this.color(1, 0, 0);
    }
  })
  .setGraphical(true);

const gpu2 = new GPU();
const updateAgents = gpu2
  .createKernel(function (
    curState: number[],
    agentList: number[],
    senseAngle: number,
    senseDistance: number,
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
      // Sense
      const senseLeftX =
        Math.cos(agentList[this.thread.x] - senseAngle) * senseDistance +
        agentList[this.thread.x - 2];
      const senseLeftY =
        Math.sin(agentList[this.thread.x] - senseAngle) * senseDistance +
        agentList[this.thread.x - 1];
      const senseRightX =
        Math.cos(agentList[this.thread.x] + senseAngle) * senseDistance +
        agentList[this.thread.x - 2];
      const senseRightY =
        Math.sin(agentList[this.thread.x] + senseAngle) * senseDistance +
        agentList[this.thread.x - 1];
      const senseForwardX =
        Math.cos(agentList[this.thread.x]) * senseDistance +
        agentList[this.thread.x - 2];
      const senseForwardY =
        Math.sin(agentList[this.thread.x]) * senseDistance +
        agentList[this.thread.x - 1];
      // Get value, if index is out of bounds avoid it
      const leftVal =
        curState[
          Math.floor(senseLeftX) * 4 + Math.floor(senseLeftY) * 4 * width + 1
        ];
      const rightVal =
        curState[
          Math.floor(senseRightX) * 4 + Math.floor(senseRightY) * 4 * width + 1
        ];
      const forwardVal =
        curState[
          Math.floor(senseForwardX) * 4 +
            Math.floor(senseForwardY) * 4 * width +
            1
        ];
      // Rotate
      const turnStrength =
        1 - randomTurnStrength + randomTurnStrength * Math.random();
      if (forwardVal >= leftVal && forwardVal >= rightVal) {
        // Don't change direction
        return agentList[this.thread.x];
      } else if (forwardVal < leftVal && forwardVal < rightVal) {
        // Change direction randomly
        return (
          agentList[this.thread.x] +
          turnStrength * turnSpeed * (Math.random() > 0.5 ? 1 : -1)
        );
      } else if (leftVal > rightVal) {
        // Turn left
        return agentList[this.thread.x] - turnSpeed * turnStrength;
      } else {
        // Turn right
        return agentList[this.thread.x] + turnSpeed * turnStrength;
      }
    }
  })
  .setPipeline(true);

export { decay, updateAgents };
