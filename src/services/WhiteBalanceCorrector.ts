import { getOpenCV } from '@/lib/opencv-loader';

/**
 * Service for automatic white balance correction
 *
 * Corrects color casts from different lighting conditions:
 * - Tungsten lighting (warm/yellow cast)
 * - Fluorescent lighting (cool/green cast)
 * - Mixed lighting
 *
 * Uses Gray World and White Patch algorithms
 */
export class WhiteBalanceCorrector {
  /**
   * Apply automatic white balance using Gray World algorithm
   *
   * Gray World assumes the average color of the image should be gray.
   * This works well for most document scanning scenarios.
   *
   * @param mat - Input/output Mat (modified in place)
   */
  autoWhiteBalance(mat: any): void {
    const cv = getOpenCV();

    // Only process if image has color
    if (mat.channels() < 3) {
      return;
    }

    const rgb = new cv.Mat();
    const channels = new cv.MatVector();

    try {
      // Convert RGBA to RGB if needed
      if (mat.channels() === 4) {
        cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);
      } else {
        mat.copyTo(rgb);
      }

      // Split into channels
      cv.split(rgb, channels);

      // Calculate average value for each channel
      const avgR = cv.mean(channels.get(0))[0];
      const avgG = cv.mean(channels.get(1))[0];
      const avgB = cv.mean(channels.get(2))[0];

      // Calculate gray average (target value)
      const avgGray = (avgR + avgG + avgB) / 3;

      // Skip correction if values are already balanced
      const tolerance = 3; // Small difference tolerance
      const maxDiff = Math.max(
        Math.abs(avgR - avgGray),
        Math.abs(avgG - avgGray),
        Math.abs(avgB - avgGray)
      );

      if (maxDiff < tolerance) {
        return; // Already balanced
      }

      // Calculate correction factors
      const scaleR = avgGray / avgR;
      const scaleG = avgGray / avgG;
      const scaleB = avgGray / avgB;

      // Limit correction to prevent overcorrection
      const maxScale = 1.5;
      const minScale = 0.67;

      const clampedR = Math.min(maxScale, Math.max(minScale, scaleR));
      const clampedG = Math.min(maxScale, Math.max(minScale, scaleG));
      const clampedB = Math.min(maxScale, Math.max(minScale, scaleB));

      // Apply correction to each channel
      channels.get(0).convertTo(channels.get(0), -1, clampedR, 0);
      channels.get(1).convertTo(channels.get(1), -1, clampedG, 0);
      channels.get(2).convertTo(channels.get(2), -1, clampedB, 0);

      // Merge channels back
      cv.merge(channels, rgb);

      // Convert back to original format
      if (mat.channels() === 4) {
        cv.cvtColor(rgb, mat, cv.COLOR_RGB2RGBA);
      } else {
        rgb.copyTo(mat);
      }
    } finally {
      rgb.delete();
      channels.delete();
    }
  }

  /**
   * Apply white balance using White Patch algorithm
   *
   * Assumes the brightest pixels should be white.
   * Good for images with known white areas (like white paper).
   *
   * @param mat - Input/output Mat (modified in place)
   * @param percentile - Percentile of brightest pixels to use (90-99, default: 95)
   */
  whitePatchBalance(mat: any, percentile: number = 95): void {
    const cv = getOpenCV();

    if (mat.channels() < 3) {
      return;
    }

    const rgb = new cv.Mat();
    const channels = new cv.MatVector();

    try {
      // Convert to RGB
      if (mat.channels() === 4) {
        cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);
      } else {
        mat.copyTo(rgb);
      }

      // Split channels
      cv.split(rgb, channels);

      // Find reference white point (high percentile value for each channel)
      const whiteR = this.calculatePercentile(channels.get(0), percentile, cv);
      const whiteG = this.calculatePercentile(channels.get(1), percentile, cv);
      const whiteB = this.calculatePercentile(channels.get(2), percentile, cv);

      // Avoid division by very small values
      const minWhite = 200; // Assume true white should be at least 200
      if (whiteR < minWhite || whiteG < minWhite || whiteB < minWhite) {
        // Not enough bright areas, fall back to gray world
        this.autoWhiteBalance(mat);
        return;
      }

      // Calculate scale factors to make white point = 255
      const scaleR = 255 / whiteR;
      const scaleG = 255 / whiteG;
      const scaleB = 255 / whiteB;

      // Apply correction
      channels.get(0).convertTo(channels.get(0), -1, scaleR, 0);
      channels.get(1).convertTo(channels.get(1), -1, scaleG, 0);
      channels.get(2).convertTo(channels.get(2), -1, scaleB, 0);

      // Merge back
      cv.merge(channels, rgb);

      // Convert to original format
      if (mat.channels() === 4) {
        cv.cvtColor(rgb, mat, cv.COLOR_RGB2RGBA);
      } else {
        rgb.copyTo(mat);
      }
    } finally {
      rgb.delete();
      channels.delete();
    }
  }

  /**
   * Apply temperature adjustment (warm/cool)
   *
   * @param mat - Input/output Mat (modified in place)
   * @param temperature - Temperature shift (-100 to 100, negative=cool, positive=warm)
   */
  adjustTemperature(mat: any, temperature: number): void {
    const cv = getOpenCV();

    if (mat.channels() < 3 || temperature === 0) {
      return;
    }

    const rgb = new cv.Mat();
    const channels = new cv.MatVector();

    try {
      // Convert to RGB
      if (mat.channels() === 4) {
        cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);
      } else {
        mat.copyTo(rgb);
      }

      // Split channels
      cv.split(rgb, channels);

      // Normalize temperature to multiplier range
      // Warm (positive): increase red, decrease blue
      // Cool (negative): decrease red, increase blue
      const scale = temperature / 100; // -1.0 to 1.0

      const redScale = 1.0 + (scale * 0.2); // ±20%
      const blueScale = 1.0 - (scale * 0.2); // ∓20%

      // Apply temperature shift
      channels.get(0).convertTo(channels.get(0), -1, redScale, 0);   // Red
      // Green stays the same
      channels.get(2).convertTo(channels.get(2), -1, blueScale, 0);  // Blue

      // Merge back
      cv.merge(channels, rgb);

      // Convert to original format
      if (mat.channels() === 4) {
        cv.cvtColor(rgb, mat, cv.COLOR_RGB2RGBA);
      } else {
        rgb.copyTo(mat);
      }
    } finally {
      rgb.delete();
      channels.delete();
    }
  }

  /**
   * Calculate percentile value for a channel
   */
  private calculatePercentile(channel: any, percentile: number, cv: any): number {
    // Calculate histogram
    const hist = new cv.Mat();
    const histSize = [256];
    const ranges = [0, 256];

    cv.calcHist(
      new cv.MatVector([channel]),
      [0],
      new cv.Mat(),
      hist,
      histSize,
      ranges,
      false
    );

    // Convert histogram to array
    const histData = Array.from(hist.data32F) as number[];

    // Calculate total pixels
    const totalPixels = histData.reduce((sum, count) => sum + count, 0);

    // Find percentile value
    const targetPixels = totalPixels * (percentile / 100);
    let cumulativePixels = 0;
    let percentileValue = 255;

    for (let i = 255; i >= 0; i--) {
      cumulativePixels += histData[i];
      if (cumulativePixels >= targetPixels) {
        percentileValue = i;
        break;
      }
    }

    hist.delete();
    return percentileValue;
  }

  /**
   * Detect and correct color cast automatically
   * Combines Gray World and White Patch based on image characteristics
   *
   * @param mat - Input/output Mat (modified in place)
   */
  smartBalance(mat: any): void {
    const cv = getOpenCV();

    if (mat.channels() < 3) {
      return;
    }

    const rgb = new cv.Mat();
    const gray = new cv.Mat();

    try {
      // Convert to RGB
      if (mat.channels() === 4) {
        cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);
      } else {
        mat.copyTo(rgb);
      }

      // Convert to grayscale to analyze brightness distribution
      cv.cvtColor(rgb, gray, cv.COLOR_RGB2GRAY);

      // Calculate average brightness
      const avgBrightness = cv.mean(gray)[0];

      // Decide which algorithm to use based on image characteristics
      if (avgBrightness > 180) {
        // Bright image with likely white areas - use white patch
        this.whitePatchBalance(mat, 98);
      } else if (avgBrightness < 70) {
        // Dark image - use gray world with limited correction
        this.autoWhiteBalance(mat);
      } else {
        // Normal image - blend both approaches
        // Save original
        const original = new cv.Mat();
        mat.copyTo(original);

        // Apply gray world
        this.autoWhiteBalance(mat);
        const grayWorld = new cv.Mat();
        mat.copyTo(grayWorld);

        // Restore original and apply white patch
        original.copyTo(mat);
        this.whitePatchBalance(mat, 95);

        // Blend results (70% gray world, 30% white patch)
        cv.addWeighted(grayWorld, 0.7, mat, 0.3, 0, mat);

        original.delete();
        grayWorld.delete();
      }
    } finally {
      rgb.delete();
      gray.delete();
    }
  }
}

// Export singleton instance
export const whiteBalanceCorrector = new WhiteBalanceCorrector();
