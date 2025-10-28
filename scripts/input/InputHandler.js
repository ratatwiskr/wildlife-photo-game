// src/scene/InputHandler.ts
/**
 * Simple pointer-based drag input. Calls back with dx/dy in **screen pixels**.
 * The consumer converts those to world deltas using viewport/canvas size.
 */
export class InputHandler {
    container;
    onDrag;
    lastX = null;
    lastY = null;
    constructor(container, onDrag) {
        this.container = container;
        this.onDrag = onDrag;
        this.attach();
    }
    attach() {
        this.container.addEventListener("pointerdown", (e) => {
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            e.target.setPointerCapture?.(e.pointerId);
        });
        this.container.addEventListener("pointermove", (e) => {
            if (this.lastX === null || this.lastY === null)
                return;
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            this.onDrag(dx, dy);
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });
        this.container.addEventListener("pointerup", (e) => {
            this.lastX = null;
            this.lastY = null;
            e.target.releasePointerCapture?.(e.pointerId);
        });
        // cancel on leave
        this.container.addEventListener("pointercancel", () => {
            this.lastX = null;
            this.lastY = null;
        });
    }
}
