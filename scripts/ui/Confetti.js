// src/ui/Confetti.ts
// Lightweight DOM-based confetti effect for celebrations.
export class Confetti {
    container;
    running = false;
    rafId = null;
    constructor() {
        this.container = document.createElement("div");
        this.container.style.position = "fixed";
        this.container.style.left = "0";
        this.container.style.top = "0";
        this.container.style.right = "0";
        this.container.style.bottom = "0";
        this.container.style.pointerEvents = "none";
        this.container.style.overflow = "hidden";
        this.container.style.zIndex = "9999";
        document.body.appendChild(this.container);
    }
    burst(count = 40) {
        // short burst of many pieces
        for (let i = 0; i < count; i++)
            this.spawnPiece(true);
    }
    startContinuous(rate = 6) {
        if (this.running)
            return;
        this.running = true;
        const loop = () => {
            for (let i = 0; i < rate; i++)
                this.spawnPiece(false);
            this.rafId = requestAnimationFrame(loop);
        };
        loop();
    }
    stop() {
        this.running = false;
        if (this.rafId)
            cancelAnimationFrame(this.rafId);
        this.rafId = null;
    }
    spawnPiece(fast = false) {
        const el = document.createElement("div");
        const size = Math.random() * 10 + 6;
        el.style.width = `${size}px`;
        el.style.height = `${size * 0.6}px`;
        el.style.position = "absolute";
        el.style.left = `${Math.random() * 100}%`;
        el.style.top = `-10px`;
        el.style.opacity = `${0.9}`;
        el.style.borderRadius = "2px";
        el.style.background = [
            "#ff5c5c",
            "#ffd166",
            "#06d6a0",
            "#118ab2",
            "#9b5de5",
        ][Math.floor(Math.random() * 5)];
        el.style.transform = `rotate(${Math.random() * 360}deg)`;
        el.style.willChange = "transform, top, opacity";
        this.container.appendChild(el);
        const duration = Math.random() * 2000 + (fast ? 300 : 2000);
        const start = performance.now();
        const startX = el.offsetLeft;
        const drift = (Math.random() - 0.5) * 200;
        const step = (now) => {
            const t = (now - start) / duration;
            if (t >= 1) {
                el.remove();
                return;
            }
            const top = t * (window.innerHeight + 40);
            const left = startX + drift * t;
            el.style.top = `${top}px`;
            el.style.left = `${left}px`;
            el.style.opacity = `${1 - t}`;
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
}
