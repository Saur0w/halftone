# 🎛️ halftone

A high-performance, client-side image processing studio that converts standard images into stunning retro, stylized aesthetics using modern web technologies. 

Built entirely with **Next.js**, **TypeScript**, and custom **GLSL Fragment Shaders**, `halftone` offloads heavy pixel manipulation from the CPU straight to the GPU via WebGL, enabling real-time, 60fps filter adjustments on massive image resolutions with zero server overhead.

## Features

*   **100% Client-Side Processing:** No image files are ever uploaded to a backend server. Everything is handled via local Blob URLs and processed directly in the browser memory.
*   **Blazing Fast GPU Shaders:** Tweak sliders for brightness, contrast, scale, and threshold patterns with instantaneous, sub-millisecond redraws.
*   **Diverse Creative Modes:**
    *   **Halftone Print:** Classic CMYK dot patterns reminiscent of vintage comic books.
    *   **Dither Studio:** Retro 8-bit mapping using customizable 4x4 or 8x8 Bayer ordered matrices.
    *   **ASCII & Matrix:** Multi-weight typography canvas utilizing highly optimized font-atlas texture mapping.
    *   **Pixelate:** Low-res grid downsampling matching classic retro game console palettes (NES, Game Boy, Sega).
    *   **Pencil Sketch:** Edges drawn with high-contrast Sobel operator filtering.

## Tech Stack

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Graphics Engine:** WebGL2 / GLSL Shaders
*   **Styling:** Tailwind CSS

## How it Works (Under the Hood)

Most web-based image editors rely on `canvas.getImageData()` to check and modify millions of pixels sequentially on the CPU thread, causing massive frame-drops on large file sizes.

`halftone` bypasses this limitation entirely:
1.  The uploaded image is bound as a **WebGL 2D Texture** and uploaded to the GPU exactly once.
2.  UI controls (sliders, drop-downs) pipe adjustments as lightweight **Uniform variables** directly into the graphics card pipeline.
3.  Custom **Fragment Shaders** compute complex algorithmic math (Sobel convolution matrices, color space dithering) in parallel across thousands of GPU cores simultaneously.

## Getting Started

To run this studio locally:

1. Clone the repository:
   ```bash
   git clone [https://github.com/your-username/halftone.git](https://github.com/your-username/halftone.git)
   cd halftone
