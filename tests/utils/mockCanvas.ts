export function mockCanvasContext(): CanvasRenderingContext2D {
  return {
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    fillStyle: "",
    font: "",
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}
