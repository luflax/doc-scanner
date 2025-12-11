/**
 * OpenCV.js Loader
 * Dynamically loads OpenCV.js WASM library on-demand
 */

declare global {
  interface Window {
    cv: any;
    Module?: any;
    __opencvLoadPromise?: Promise<any> | null;
  }
}

let isLoaded = false;

/**
 * Load OpenCV.js from CDN
 */
export function loadOpenCV(): Promise<any> {
  // Use a single global promise so hot-reload / multiple bundles share it
  if (window.__opencvLoadPromise) return window.__opencvLoadPromise;
  if (isLoaded && window.cv) return Promise.resolve(window.cv);

  let resolvePromise: any;
  let rejectPromise: any;

  window.__opencvLoadPromise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
    // Ensure Module exists and we set the init callback BEFORE loading script
    window.Module = window.Module || {};
    const previousInit = window.Module.onRuntimeInitialized;

    window.Module.onRuntimeInitialized = () => {
      try {
        isLoaded = true;
        console.log('[loadOpenCV] Module.onRuntimeInitialized fired');
        resolvePromise(window.cv);
      } catch (err) {
        console.error('[loadOpenCV] error resolving promise', err);
        rejectPromise(err);
      }
    };

    // Create script element
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';

    script.onload = () => {
      console.log('[loadOpenCV] script.onload executed; window.cv=', !!window.cv);
      // If cv already initialized synchronously and Module callback won't be called,
      // check for cv.Mat and resolve manually.
      if (window.cv && window.cv.Mat) {
        try {
          if (!isLoaded) {
            isLoaded = true;
            console.log('[loadOpenCV] cv.Mat present on load — resolving immediately');
            resolvePromise(window.cv);
          } else {
            console.log('[loadOpenCV] already marked loaded');
          }
        } catch (err) {
          console.error('[loadOpenCV] error resolving onload', err);
          rejectPromise(err);
        }
      }
      // otherwise, wait for Module.onRuntimeInitialized to run
    };

    script.onerror = (ev) => {
      console.error('[loadOpenCV] script.onerror', ev);
      // clear the global promise so retries can happen
      window.__opencvLoadPromise = null;
      // restore previous init if any
      if (previousInit) window.Module.onRuntimeInitialized = previousInit;
      rejectPromise(new Error('Failed to load OpenCV.js script'));
    };

    document.body.appendChild(script);
  });

  // Optional: attach catch so unhandled rejection doesn't get swallowed
  window.__opencvLoadPromise.catch((e) => {
    console.error('[loadOpenCV] promise rejected', e);
  });

  return window.__opencvLoadPromise;
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
