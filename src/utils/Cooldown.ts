export class Cooldown {
  private active = false;
  private duration: number;

  constructor(durationMs: number) {
    this.duration = durationMs;
  }

  isActive() {
    return this.active;
  }

  trigger() {
    if (this.active) return false;
    this.active = true;
    setTimeout(() => {
      this.active = false;
    }, this.duration);
    return true;
  }
}
