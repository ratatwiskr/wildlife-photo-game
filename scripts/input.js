export class InputHandler {
    container;
    onDrag;
    lastX = null;
    constructor(container, onDrag) {
        this.container = container;
        this.onDrag = onDrag;
        this.attach();
    }
    attach() {
        this.container.addEventListener("pointerdown", e => {
            this.lastX = e.clientX;
            this.container.setPointerCapture(e.pointerId);
        });
        this.container.addEventListener("pointermove", e => {
            if (this.lastX !== null) {
                const dx = e.clientX - this.lastX;
                this.onDrag(dx);
                this.lastX = e.clientX;
            }
        });
        this.container.addEventListener("pointerup", e => {
            this.lastX = null;
            this.container.releasePointerCapture(e.pointerId);
        });
    }
}
