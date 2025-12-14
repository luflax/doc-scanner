import { getOpenCV, imageDataToMat, deleteMat } from '@/lib/opencv-loader';
import type { Histogram, HistogramAnalysis } from '@/types';

/**
 * Service for analyzing image histograms and providing enhancement recommendations
 */
export class HistogramAnalyzer {
  /**
   * Analyze image histogram and characteristics
   */
  analyzeImage(imageData: ImageData): HistogramAnalysis {
    let src: any = null;
    let channels: any = null;

    try {
      const cv = getOpenCV();
      src = imageDataToMat(imageData);

      // Calculate histogram
      const histogram = this.calculateHistogram(src, cv);

      // Analyze clipping
      const { isUnderexposed, isOverexposed, shadowClipping, highlightClipping } =
        this.analyzeClipping(histogram);

      // Calculate dynamic range
      const dynamicRange = this.calculateDynamicRange(histogram);

      // Analyze brightness and contrast
      const averageBrightness = histogram.mean.l;
      const contrast = this.calculateContrast(histogram);

      // Detect color cast
      const { hasColorCast, colorCastType, colorCastStrength } =
        this.detectColorCast(histogram);

      // Calculate shadow/highlight percentages
      const shadowPercentage = this.calculateShadowPercentage(histogram);
      const highlightPercentage = this.calculateHighlightPercentage(histogram);

      return {
        histogram,
        isUnderexposed,
        isOverexposed,
        shadowClipping,
        highlightClipping,
        dynamicRange,
        averageBrightness,
        contrast,
        hasColorCast,
        colorCastType,
        colorCastStrength,
        shadowPercentage,
        highlightPercentage,
      };
    } finally {
      deleteMat(src);
      if (channels) channels.delete();
    }
  }

  /**
   * Calculate RGB and luminance histograms
   */
  private calculateHistogram(mat: any, cv: any): Histogram {
    // Convert RGBA to RGB
    const rgb = new cv.Mat();
    cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);

    // Split channels
    const channels = new cv.MatVector();
    cv.split(rgb, channels);

    // Calculate histograms for each channel
    const histSize = [256];
    const ranges = [0, 256];
    const histR = new cv.Mat();
    const histG = new cv.Mat();
    const histB = new cv.Mat();

    cv.calcHist(new cv.MatVector([channels.get(0)]), [0], new cv.Mat(), histR, histSize, ranges, false);
    cv.calcHist(new cv.MatVector([channels.get(1)]), [0], new cv.Mat(), histG, histSize, ranges, false);
    cv.calcHist(new cv.MatVector([channels.get(2)]), [0], new cv.Mat(), histB, histSize, ranges, false);

    // Calculate luminance histogram
    const gray = new cv.Mat();
    cv.cvtColor(rgb, gray, cv.COLOR_RGB2GRAY);
    const histL = new cv.Mat();
    cv.calcHist(new cv.MatVector([gray]), [0], new cv.Mat(), histL, histSize, ranges, false);

    // Convert to arrays
    const red = Array.from(histR.data32F) as number[];
    const green = Array.from(histG.data32F) as number[];
    const blue = Array.from(histB.data32F) as number[];
    const luminance = Array.from(histL.data32F) as number[];

    // Calculate mean values
    const meanR = cv.mean(channels.get(0))[0];
    const meanG = cv.mean(channels.get(1))[0];
    const meanB = cv.mean(channels.get(2))[0];
    const meanL = cv.mean(gray)[0];

    // Calculate standard deviations
    const stdR = this.calculateStd(channels.get(0), meanR, cv);
    const stdG = this.calculateStd(channels.get(1), meanG, cv);
    const stdB = this.calculateStd(channels.get(2), meanB, cv);
    const stdL = this.calculateStd(gray, meanL, cv);

    // Cleanup
    rgb.delete();
    channels.delete();
    histR.delete();
    histG.delete();
    histB.delete();
    histL.delete();
    gray.delete();

    return {
      red,
      green,
      blue,
      luminance,
      mean: { r: meanR, g: meanG, b: meanB, l: meanL },
      std: { r: stdR, g: stdG, b: stdB, l: stdL },
    };
  }

  /**
   * Calculate standard deviation for a channel
   */
  private calculateStd(channel: any, mean: number, cv: any): number {
    const temp = new cv.Mat();
    const squared = new cv.Mat();

    // Calculate (value - mean)^2
    cv.subtract(channel, new cv.Scalar(mean), temp);
    cv.multiply(temp, temp, squared);

    // Calculate mean of squared differences
    const variance = cv.mean(squared)[0];
    const std = Math.sqrt(variance);

    temp.delete();
    squared.delete();

    return std;
  }

  /**
   * Analyze image for clipping (over/underexposure)
   */
  private analyzeClipping(histogram: Histogram): {
    isUnderexposed: boolean;
    isOverexposed: boolean;
    shadowClipping: number;
    highlightClipping: number;
  } {
    const totalPixels = histogram.luminance.reduce((sum, count) => sum + count, 0);

    // Count pixels in shadows (0-15) and highlights (240-255)
    const shadowPixels = histogram.luminance.slice(0, 16).reduce((sum, count) => sum + count, 0);
    const highlightPixels = histogram.luminance.slice(240).reduce((sum, count) => sum + count, 0);

    const shadowClipping = (shadowPixels / totalPixels) * 100;
    const highlightClipping = (highlightPixels / totalPixels) * 100;

    // Consider underexposed if >10% of pixels are in shadows
    const isUnderexposed = shadowClipping > 10;

    // Consider overexposed if >10% of pixels are in highlights
    const isOverexposed = highlightClipping > 10;

    return {
      isUnderexposed,
      isOverexposed,
      shadowClipping,
      highlightClipping,
    };
  }

  /**
   * Calculate dynamic range of the image
   */
  private calculateDynamicRange(histogram: Histogram): number {
    // Find min and max values with significant pixel count (>0.1% of total)
    const totalPixels = histogram.luminance.reduce((sum, count) => sum + count, 0);
    const threshold = totalPixels * 0.001;

    let minValue = 0;
    let maxValue = 255;

    // Find minimum
    for (let i = 0; i < 256; i++) {
      if (histogram.luminance[i] > threshold) {
        minValue = i;
        break;
      }
    }

    // Find maximum
    for (let i = 255; i >= 0; i--) {
      if (histogram.luminance[i] > threshold) {
        maxValue = i;
        break;
      }
    }

    return maxValue - minValue;
  }

  /**
   * Calculate contrast measure
   */
  private calculateContrast(histogram: Histogram): number {
    // Use standard deviation as a measure of contrast
    // Normalize to 0-100 scale
    const contrast = (histogram.std.l / 255) * 100;
    return Math.min(100, contrast * 2.5); // Scale up for better range
  }

  /**
   * Detect color cast in the image
   */
  private detectColorCast(histogram: Histogram): {
    hasColorCast: boolean;
    colorCastType?: 'warm' | 'cool' | 'green' | 'magenta';
    colorCastStrength: number;
  } {
    const { r, g, b } = histogram.mean;

    // Calculate color differences
    const rg = r - g;
    const rb = r - b;
    const gb = g - b;

    // Determine dominant color cast
    const absRG = Math.abs(rg);
    const absRB = Math.abs(rb);
    const absGB = Math.abs(gb);

    const maxDiff = Math.max(absRG, absRB, absGB);

    // Threshold for detecting color cast (5 on 0-255 scale)
    const threshold = 5;
    const hasColorCast = maxDiff > threshold;

    let colorCastType: 'warm' | 'cool' | 'green' | 'magenta' | undefined;
    if (hasColorCast) {
      if (maxDiff === absRB) {
        // Red-blue difference dominant
        colorCastType = rb > 0 ? 'warm' : 'cool';
      } else if (maxDiff === absRG) {
        // Red-green difference dominant
        colorCastType = rg > 0 ? 'magenta' : 'green';
      } else {
        // Green-blue difference dominant
        colorCastType = gb > 0 ? 'warm' : 'cool';
      }
    }

    // Normalize strength to 0-100
    const colorCastStrength = Math.min(100, (maxDiff / 50) * 100);

    return {
      hasColorCast,
      colorCastType,
      colorCastStrength,
    };
  }

  /**
   * Calculate percentage of image in shadows
   */
  private calculateShadowPercentage(histogram: Histogram): number {
    const totalPixels = histogram.luminance.reduce((sum, count) => sum + count, 0);
    // Consider shadows as luminance < 80
    const shadowPixels = histogram.luminance.slice(0, 80).reduce((sum, count) => sum + count, 0);
    return (shadowPixels / totalPixels) * 100;
  }

  /**
   * Calculate percentage of image in highlights
   */
  private calculateHighlightPercentage(histogram: Histogram): number {
    const totalPixels = histogram.luminance.reduce((sum, count) => sum + count, 0);
    // Consider highlights as luminance > 200
    const highlightPixels = histogram.luminance.slice(200).reduce((sum, count) => sum + count, 0);
    return (highlightPixels / totalPixels) * 100;
  }

  /**
   * Generate enhancement recommendations based on analysis
   */
  recommendEnhancements(analysis: HistogramAnalysis): {
    brightness: number;
    contrast: number;
    shadows: number;
    highlights: number;
    saturation: number;
  } {
    let brightness = 0;
    let contrast = 0;
    let shadows = 0;
    let highlights = 0;
    let saturation = 0;

    // Brightness adjustment
    if (analysis.isUnderexposed && analysis.averageBrightness < 100) {
      brightness = Math.min(30, (100 - analysis.averageBrightness) / 3);
    } else if (analysis.isOverexposed && analysis.averageBrightness > 180) {
      brightness = -Math.min(30, (analysis.averageBrightness - 180) / 3);
    } else if (analysis.averageBrightness < 120) {
      brightness = (120 - analysis.averageBrightness) / 4;
    } else if (analysis.averageBrightness > 140) {
      brightness = -(analysis.averageBrightness - 140) / 4;
    }

    // Contrast adjustment
    if (analysis.contrast < 30) {
      contrast = 30 - analysis.contrast;
    } else if (analysis.contrast > 70) {
      contrast = -(analysis.contrast - 70) / 2;
    }

    // Shadow recovery
    if (analysis.shadowPercentage > 20) {
      shadows = Math.min(50, analysis.shadowPercentage * 1.5);
    }

    // Highlight recovery
    if (analysis.highlightPercentage > 10) {
      highlights = Math.min(40, analysis.highlightPercentage * 2);
    }

    // Saturation adjustment
    if (analysis.hasColorCast && analysis.colorCastStrength < 20) {
      // Slight desaturation for mild color cast
      saturation = -10;
    } else if (analysis.contrast > 50) {
      // Slight saturation boost for good contrast images
      saturation = 10;
    }

    return {
      brightness: Math.round(brightness),
      contrast: Math.round(contrast),
      shadows: Math.round(shadows),
      highlights: Math.round(highlights),
      saturation: Math.round(saturation),
    };
  }
}

// Export singleton instance
export const histogramAnalyzer = new HistogramAnalyzer();
