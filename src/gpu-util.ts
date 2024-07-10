import { GPU } from "gpu.js";

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
  .setGraphical(true);

export { decay };
