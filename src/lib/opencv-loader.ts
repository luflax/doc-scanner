/**
 * OpenCV.js Loader
 * Dynamically loads OpenCV.js WASM library on-demand
 */

declare global {
  interface Window {
    cv: any;
  }
}

let opencvLoadPromise: Promise<any> | null = null;
let isLoaded = false;

/**
 * Load OpenCV.js from CDN
 */
export async function loadOpenCV(): Promise<any> {
  // Return existing promise if already loading
  if (opencvLoadPromise) {
    return opencvLoadPromise;
  }

  // Return immediately if already loaded
  if (isLoaded && window.cv) {
    return Promise.resolve(window.cv);
  }

  opencvLoadPromise = new Promise((resolve, reject) => {
    // Create script element
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';

    // Handle load success
    script.onload = () => {
      // OpenCV.js initializes asynchronously after script load
      // We need to wait for cv.onRuntimeInitialized
      if (window.cv) {
        window.cv.onRuntimeInitialized = () => {
          isLoaded = true;
          console.log('OpenCV.js loaded successfully');
          resolve(window.cv);
        };
      } else {
        reject(new Error('OpenCV.js failed to load: cv not found'));
      }
    };

    // Handle load error
    script.onerror = () => {
      opencvLoadPromise = null;
      reject(new Error('Failed to load OpenCV.js script'));
    };

    // Add script to document
    document.body.appendChild(script);
  });

  return opencvLoadPromise;
}

/**
 * Check if OpenCV is loaded
 */
export function isOpenCVLoaded(): boolean {
  return isLoaded && !!window.cv;
}

/**
 * Get OpenCV instance (assumes already loaded)
 */
export function getOpenCV(): any {
  if (!isLoaded || !window.cv) {
    throw new Error('OpenCV not loaded. Call loadOpenCV() first.');
  }
  return window.cv;
}

/**
 * Utility to convert ImageData to cv.Mat
 */
export function imageDataToMat(imageData: ImageData): any {
  const cv = getOpenCV();
  const mat = cv.matFromImageData(imageData);
  return mat;
}

/**
 * Utility to convert cv.Mat to ImageData
 */
export function matToImageData(mat: any): ImageData {
  const cv = getOpenCV();

  // Create canvas to convert mat to ImageData
  const canvas = document.createElement('canvas');
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Show mat on canvas
  cv.imshow(canvas, mat);

  // Get ImageData from canvas
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Utility to convert cv.Mat to canvas
 */
export function matToCanvas(mat: any, canvas: HTMLCanvasElement): void {
  const cv = getOpenCV();
  cv.imshow(canvas, mat);
}

/**
 * Cleanup mat to free memory
 */
export function deleteMat(...mats: any[]): void {
  for (const mat of mats) {
    if (mat && mat.delete) {
      mat.delete();
    }
  }
}
