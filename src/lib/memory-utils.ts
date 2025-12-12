/**
 * Memory Management Utilities
 * Helpers for managing memory in image processing applications
 */

/**
 * Estimate memory usage of an ImageData object
 */
export function estimateImageDataMemory(imageData: ImageData): number {
  // Each pixel has 4 bytes (RGBA)
  return imageData.width * imageData.height * 4;
}

/**
 * Estimate memory usage of a canvas
 */
export function estimateCanvasMemory(canvas: HTMLCanvasElement): number {
  return canvas.width * canvas.height * 4;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Check if browser has enough memory for an operation
 */
export function hasEnoughMemory(requiredBytes: number): boolean {
  if ('memory' in performance && (performance as any).memory) {
    const memInfo = (performance as any).memory;
    const availableMemory = memInfo.jsHeapSizeLimit - memInfo.usedJSHeapSize;
    return availableMemory > requiredBytes * 1.5; // 1.5x safety margin
  }
  // If memory API not available, assume we have enough
  return true;
}

/**
 * Cleanup ImageData by nullifying reference
 */
export function cleanupImageData(imageData: ImageData | null): void {
  if (imageData) {
    // Clear the data array
    if (imageData.data) {
      imageData.data.fill(0);
    }
  }
}

/**
 * Cleanup Canvas by clearing and resetting
 */
export function cleanupCanvas(canvas: HTMLCanvasElement | null): void {
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // Reset dimensions to free memory
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Create a downscaled ImageData for preview/processing
 */
export function downscaleImageData(
  imageData: ImageData,
  maxWidth: number,
  maxHeight: number
): ImageData {
  const { width, height } = imageData;

  // Calculate new dimensions maintaining aspect ratio
  let newWidth = width;
  let newHeight = height;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    newWidth = Math.floor(width * ratio);
    newHeight = Math.floor(height * ratio);
  }

  // If no scaling needed, return original
  if (newWidth === width && newHeight === height) {
    return imageData;
  }

  // Create canvas for downscaling
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.putImageData(imageData, 0, 0);

  // Create scaled canvas
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = newWidth;
  scaledCanvas.height = newHeight;
  const scaledCtx = scaledCanvas.getContext('2d');

  if (!scaledCtx) {
    throw new Error('Failed to get scaled canvas context');
  }

  // Use high-quality image smoothing
  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = 'high';

  // Draw scaled image
  scaledCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

  // Get scaled ImageData
  return scaledCtx.getImageData(0, 0, newWidth, newHeight);
}

/**
 * Force garbage collection (if available in development)
 */
export function tryGarbageCollect(): void {
  // Only available in Node.js or special browser builds with --expose-gc
  if (typeof window !== 'undefined' && 'gc' in window && typeof (window as any).gc === 'function') {
    (window as any).gc();
  }
}

/**
 * Get memory usage information (Chrome only)
 */
export function getMemoryInfo(): {
  used: number;
  total: number;
  limit: number;
} | null {
  if ('memory' in performance && (performance as any).memory) {
    const memInfo = (performance as any).memory;
    return {
      used: memInfo.usedJSHeapSize,
      total: memInfo.totalJSHeapSize,
      limit: memInfo.jsHeapSizeLimit,
    };
  }
  return null;
}

/**
 * Monitor memory usage and warn if getting high
 */
export function checkMemoryPressure(): {
  isHigh: boolean;
  percentage: number;
  message: string;
} {
  const memInfo = getMemoryInfo();

  if (!memInfo) {
    return {
      isHigh: false,
      percentage: 0,
      message: 'Memory monitoring not available',
    };
  }

  const percentage = (memInfo.used / memInfo.limit) * 100;
  const isHigh = percentage > 80;

  return {
    isHigh,
    percentage,
    message: isHigh
      ? `Memory usage is high (${percentage.toFixed(1)}%). Consider closing some documents.`
      : `Memory usage: ${percentage.toFixed(1)}%`,
  };
}
