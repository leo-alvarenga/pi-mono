import { SPINNER_FRAMES } from "../config/constants";
import type { SpinnerPhase } from "../config/types";

export class SpinnerController {
  private idx = 0;
  private phase: SpinnerPhase | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  start(phase: SpinnerPhase, onTick: () => void): void {
    if (this.phase === phase) return;

    this.idx = 0;
    this.phase = phase;
    this.clear();

    const frames = SPINNER_FRAMES[phase];
    this.timer = setInterval(() => {
      this.idx = (this.idx + 1) % frames.length;
      onTick();
    }, 80);
    onTick();
  }

  stop(): void {
    this.clear();
    this.phase = null;
  }

  frame(): string {
    if (!this.phase) return "";
    const frames = SPINNER_FRAMES[this.phase];

    return frames[this.idx % frames.length]!;
  }

  private clear(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
