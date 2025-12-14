/**
 * EdgeDetector Service
 * Implements document edge detection using OpenCV.js
 * Based on TECHNICAL_SPECIFICATION.md Section 3.2
 */

import { getOpenCV, imageDataToMat, deleteMat } from '@/lib/opencv-loader';
import type { DetectedEdge, EdgeDetectionConfig, Point, Rectangle } from '@/types';

export const DEFAULT_EDGE_DETECTION_CONFIG: EdgeDetectionConfig = {
  cannyThreshold1: 30, // Lowered from 50 for better edge detection at angles
  cannyThreshold2: 100, // Lowered from 150 for more sensitivity
  blurKernelSize: 5,
  dilationIterations: 3, // Increased from 2 to close more gaps
  minAreaRatio: 0.05, // Lowered from 0.1 to detect smaller/angled documents
  maxAreaRatio: 0.98, // Increased from 0.95 for better full-frame detection
};

export class EdgeDetector {
  private config: EdgeDetectionConfig;

  constructor(config: Partial<EdgeDetectionConfig> = {}) {
    this.config = { ...DEFAULT_EDGE_DETECTION_CONFIG, ...config };
  }

  /**
   * Main detection method for full-resolution images
   */
  async detectDocument(imageData: ImageData): Promise<DetectedEdge | null> {
    const cv = getOpenCV();
    let src: any = null;
    let gray: any = null;
    let blurred: any = null;
    let edges: any = null;
    let dilated: any = null;
    let contours: any = null;
    let hierarchy: any = null;

    try {
      // Convert ImageData to cv.Mat
      src = imageDataToMat(imageData);

      // Preprocessing: Convert to grayscale
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // Apply Gaussian blur
      blurred = new cv.Mat();
      const ksize = new cv.Size(this.config.blurKernelSize, this.config.blurKernelSize);
      cv.GaussianBlur(gray, blurred, ksize, 0);

      // Edge Detection: Apply Canny edge detector
      edges = new cv.Mat();
      cv.Canny(blurred, edges, this.config.cannyThreshold1, this.config.cannyThreshold2);

      // Dilate edges to close gaps
      dilated = new cv.Mat();
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      cv.dilate(edges, dilated, kernel, new cv.Point(-1, -1), this.config.dilationIterations);
      kernel.delete();

      // Contour Detection: Find all contours
      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      // Filter and score contours
      const detected = this.findBestContour(contours, imageData.width, imageData.height);

      return detected;
    } catch (error) {
      console.error('Edge detection failed:', error);
      return null;
    } finally {
      // Cleanup
      deleteMat(src, gray, blurred, edges, dilated, hierarchy);
      if (contours) contours.delete();
    }
  }

  /**
   * Real-time detection for preview (optimized, lower resolution)
   * Processes faster by using lower resolution input
   */
  detectDocumentFast(imageData: ImageData): DetectedEdge | null {
    // Use the same algorithm but optimized for speed
    // The input should already be downscaled before calling this
    return this.detectDocumentSync(imageData);
  }

  /**
   * Synchronous detection (used by fast detection)
   */
  private detectDocumentSync(imageData: ImageData): DetectedEdge | null {
    const cv = getOpenCV();
    let src: any = null;
    let gray: any = null;
    let blurred: any = null;
    let edges: any = null;
    let dilated: any = null;
    let contours: any = null;
    let hierarchy: any = null;

    try {
      src = imageDataToMat(imageData);
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      blurred = new cv.Mat();
      const ksize = new cv.Size(this.config.blurKernelSize, this.config.blurKernelSize);
      cv.GaussianBlur(gray, blurred, ksize, 0);

      edges = new cv.Mat();
      cv.Canny(blurred, edges, this.config.cannyThreshold1, this.config.cannyThreshold2);

      dilated = new cv.Mat();
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      cv.dilate(edges, dilated, kernel, new cv.Point(-1, -1), this.config.dilationIterations);
      kernel.delete();

      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      const detected = this.findBestContour(contours, imageData.width, imageData.height);

      return detected;
    } catch (error) {
      console.error('Fast edge detection failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, blurred, edges, dilated, hierarchy);
      if (contours) contours.delete();
    }
  }

  /**
   * Find the best contour that represents a document
   */
  private findBestContour(
    contours: any,
    imageWidth: number,
    imageHeight: number
  ): DetectedEdge | null {
    const cv = getOpenCV();
    const imageArea = imageWidth * imageHeight;
    const minArea = imageArea * this.config.minAreaRatio;
    const maxArea = imageArea * this.config.maxAreaRatio;

    let bestContour: any = null;
    let bestScore = 0;
    let bestApprox: any = null;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      // Filter by area
      if (area < minArea || area > maxArea) {
        continue;
      }

      // Approximate contour to polygon
      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

      // We want a 4-sided polygon (quadrilateral)
      if (approx.rows === 4) {
        // Score this contour
        const score = this.scoreContour(approx, area, imageArea);

        if (score > bestScore) {
          if (bestApprox) bestApprox.delete();
          bestScore = score;
          bestContour = contour;
          bestApprox = approx;
        } else {
          approx.delete();
        }
      } else {
        approx.delete();
      }
    }

    if (bestApprox && bestContour) {
      const result = this.createDetectedEdge(bestApprox, bestContour, imageWidth, imageHeight);
      bestApprox.delete();
      return result;
    }

    return null;
  }

  /**
   * Score a contour based on area, convexity, and aspect ratio
   */
  private scoreContour(approx: any, area: number, imageArea: number): number {
    const cv = getOpenCV();

    // Score by area (larger is better, up to a point)
    const areaRatio = area / imageArea;
    // Use a curve that rewards larger areas but doesn't penalize smaller ones too much
    const areaScore = Math.min(1.0, areaRatio * 2);

    // Score by convexity (convex shapes score higher, but non-convex is still acceptable)
    const isConvex = cv.isContourConvex(approx);
    const convexityScore = isConvex ? 1.0 : 0.7; // Relaxed from 0.5 to 0.7

    // Score by aspect ratio (more lenient for angled documents)
    const rect = cv.boundingRect(approx);
    const aspectRatio = Math.max(rect.width, rect.height) / Math.min(rect.width, rect.height);
    // Much more lenient aspect ratio range (1.0 to 3.0) to handle angled views
    // Documents at steep angles can appear very elongated
    let aspectScore = 1.0;
    if (aspectRatio < 1.0 || aspectRatio > 4.0) {
      // Outside reasonable range
      aspectScore = 0.5;
    } else if (aspectRatio >= 1.2 && aspectRatio <= 2.5) {
      // Ideal range - most common document ratios
      aspectScore = 1.0;
    } else {
      // Acceptable but not ideal
      aspectScore = 0.8;
    }

    // Combined score - area is most important, then shape quality
    return areaScore * 0.6 + convexityScore * 0.2 + aspectScore * 0.2;
  }

  /**
   * Create DetectedEdge object from contour
   */
  private createDetectedEdge(
    approx: any,
    contour: any,
    imageWidth: number,
    imageHeight: number
  ): DetectedEdge {
    const cv = getOpenCV();

    // Extract corner points
    const corners: Point[] = [];
    for (let i = 0; i < approx.rows; i++) {
      corners.push({
        x: approx.data32S[i * 2],
        y: approx.data32S[i * 2 + 1],
      });
    }

    // Order corners: top-left, top-right, bottom-right, bottom-left
    const orderedCorners = this.orderCorners(corners);

    // Calculate metrics
    const area = cv.contourArea(contour);
    const boundingRect = cv.boundingRect(contour);
    const aspectRatio = boundingRect.width / boundingRect.height;

    // Calculate confidence (0-1)
    const imageArea = imageWidth * imageHeight;
    const areaRatio = area / imageArea;
    const confidence = Math.min(1.0, areaRatio * 2); // Simple confidence calculation

    return {
      contour: orderedCorners,
      confidence,
      area,
      aspectRatio,
      boundingRect: {
        x: boundingRect.x,
        y: boundingRect.y,
        width: boundingRect.width,
        height: boundingRect.height,
      },
    };
  }

  /**
   * Order corners clockwise from top-left
   * Returns: [top-left, top-right, bottom-right, bottom-left]
   */
  private orderCorners(corners: Point[]): Point[] {
    if (corners.length !== 4) {
      return corners;
    }

    // Sort by sum (x + y): top-left has smallest sum, bottom-right has largest
    const sorted = [...corners].sort((a, b) => a.x + a.y - (b.x + b.y));

    const topLeft = sorted[0];
    const bottomRight = sorted[3];

    // Sort remaining two by difference (x - y)
    const remaining = [sorted[1], sorted[2]].sort((a, b) => a.x - a.y - (b.x - b.y));

    const topRight = remaining[1];
    const bottomLeft = remaining[0];

    return [topLeft, topRight, bottomRight, bottomLeft];
  }

  /**
   * Update detection configuration
   */
  updateConfig(config: Partial<EdgeDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const edgeDetector = new EdgeDetector();
