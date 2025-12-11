/**
 * OpenCV.js Loader
 * Dynamically loads OpenCV.js WASM library on-demand
 */

declare global {
  interface Window {
    cv: any;
    Module?: any;
    __opencvLoadPromise?: Promise<any> | null;
    __resolvePromise?: any;
    __rejectPromise?: any;
  }
}

let isLoaded = false;

/**
 * Load OpenCV.js - handles both script tag in HTML and dynamic loading
 */
export function loadOpenCV(): Promise<any> {
  // Use a single global promise so hot-reload / multiple bundles share it
  if (window.__opencvLoadPromise) return window.__opencvLoadPromise;

  // If already loaded and ready, return immediately
  if (isLoaded && window.cv && window.cv.Mat) {
    return Promise.resolve(window.cv);
  }

  // If cv exists and is ready (loaded via HTML script tag)
  if (window.cv && window.cv.Mat) {
    isLoaded = true;
    console.log('[loadOpenCV] OpenCV already loaded via script tag');
    return Promise.resolve(window.cv);
  }

  window.__opencvLoadPromise = new Promise((resolve, reject) => {
    window.__resolvePromise = resolve;
    window.__rejectPromise = reject;

    // Ensure Module exists and we set the init callback BEFORE loading script
    window.Module = window.Module || {};
    const previousInit = window.Module.onRuntimeInitialized;

    window.Module.onRuntimeInitialized = () => {
      try {
        isLoaded = true;
        console.log('[loadOpenCV] Module.onRuntimeInitialized fired');
        window.__resolvePromise(window.cv);
      } catch (err) {
        console.error('[loadOpenCV] error resolving promise', err);
        window.__rejectPromise(err);
      }
    };

    // Check if script is already in the document (from index.html)
    const existingScript = document.querySelector('script[src*="opencv.js"]');

    if (existingScript) {
      console.log('[loadOpenCV] OpenCV script already in document, waiting for load');
      // Script exists, just wait for it to load
      // Check periodically if cv is ready
      const checkInterval = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkInterval);
          if (!isLoaded) {
            isLoaded = true;
            console.log('[loadOpenCV] OpenCV loaded and ready');
            window.__resolvePromise(window.cv);
          }
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isLoaded) {
          window.__opencvLoadPromise = null;
          window.__rejectPromise(new Error('Timeout waiting for OpenCV to load'));
        }
      }, 30000);
    } else {
      // No existing script, create one dynamically
      console.log('[loadOpenCV] Creating OpenCV script dynamically');
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
              window.__resolvePromise(window.cv);
            } else {
              console.log('[loadOpenCV] already marked loaded');
            }
          } catch (err) {
            console.error('[loadOpenCV] error resolving onload', err);
            window.__rejectPromise(err);
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
        window.__rejectPromise(new Error('Failed to load OpenCV.js script'));
      };

      document.body.appendChild(script);
    }
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
  // Check both the flag and window.cv to handle cases where
  // OpenCV was loaded via script tag before our module initialized
  return (isLoaded || !!window.cv);
}

/**
 * Get OpenCV instance (assumes already loaded)
 */
export function getOpenCV(): any {
  if (!window.cv) {
    throw new Error('OpenCV not loaded. Call loadOpenCV() first.');
  }
  // Update the flag if OpenCV is available but flag wasn't set
  if (!isLoaded && window.cv) {
    isLoaded = true;
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
