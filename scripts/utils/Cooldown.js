export class Cooldown {
    active = false;
    duration;
    constructor(durationMs) {
        this.duration = durationMs;
    }
    isActive() {
        return this.active;
    }
    trigger() {
        if (this.active)
            return false;
        this.active = true;
        setTimeout(() => {
            this.active = false;
        }, this.duration);
        return true;
    }
}
