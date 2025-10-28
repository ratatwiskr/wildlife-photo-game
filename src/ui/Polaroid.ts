export class PolaroidUI {
  private container: HTMLDivElement;
  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.inset = '0';
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';
    this.container.style.background = 'rgba(0,0,0,0.6)';
    this.container.style.zIndex = '9999';
    this.container.style.cursor = 'pointer';
    this.container.addEventListener('click', () => this.hide());
  }

  show(polaroid: HTMLCanvasElement) {
    this.container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';
    wrap.style.display = 'inline-block';
    wrap.appendChild(polaroid);
    this.container.appendChild(wrap);
    document.body.appendChild(this.container);
  }

  hide() {
    if (this.container.parentElement) this.container.parentElement.removeChild(this.container);
  }
}
