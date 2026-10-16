// src/utils/canvas.ts
/**
 * Create an offscreen canvas sized for reading pixel data back.
 * `willReadFrequently` hints the browser to optimize for getImageData() calls.
 */
export function createOffscreenCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    return { canvas, ctx };
}
