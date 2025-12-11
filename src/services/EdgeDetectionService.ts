import { loadOpenCV, imageDataToMat, deleteMat, isOpenCVLoaded } from '@/lib/opencv-loader';
import type { DetectedEdge, EdgeDetectionConfig, Point, Rectangle } from '@/types';

export class EdgeDetectionService {
  private cv: any = null;
  private isInitialized = false;

  /**
   * Initialize the edge detection service by loading OpenCV
   */
  async initialize(): Promise<void> {
    console.log('[EdgeDetectionService] initialize() called, isInitialized:', this.isInitialized);
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[EdgeDetectionService] Calling loadOpenCV()');
      this.cv = await loadOpenCV();
      console.log('[EdgeDetectionService] loadOpenCV() completed, cv:', this.cv);
      this.isInitialized = true;
      console.log('[EdgeDetectionService] EdgeDetectionService initialized');
    } catch (error) {
      console.error('[EdgeDetectionService] Failed to initialize EdgeDetectionService:', error);
      throw error;
    }
  }

  /**
   * Detect document edges in the image
   */
  async detectDocument(
    imageData: ImageData,
    config?: Partial<EdgeDetectionConfig>
  ): Promise<DetectedEdge | null> {
    console.log('[EdgeDetectionService] detectDocument() called, image size:', imageData.width, 'x', imageData.height);
    if (!this.isInitialized) {
      console.log('[EdgeDetectionService] Not initialized, calling initialize()');
      await this.initialize();
    }

    const defaultConfig: EdgeDetectionConfig = {
      cannyThreshold1: 50,
      cannyThreshold2: 150,
      blurKernelSize: 5,
      dilationIterations: 2,
      minAreaRatio: 0.1,
      maxAreaRatio: 0.95,
    };

    const finalConfig = { ...defaultConfig, ...config };

    let src: any = null;
    let gray: any = null;
    let blurred: any = null;
    let edges: any = null;
    let dilated: any = null;
    let contours: any = null;
    let hierarchy: any = null;

    try {
      console.log('[EdgeDetectionService] Starting edge detection pipeline');

      // Convert ImageData to Mat
      console.log('[EdgeDetectionService] Converting ImageData to Mat');
      src = imageDataToMat(imageData);
      console.log('[EdgeDetectionService] ImageData converted, Mat size:', src.rows, 'x', src.cols);

      // Convert to grayscale
      console.log('[EdgeDetectionService] Converting to grayscale');
      gray = new this.cv.Mat();
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);
      console.log('[EdgeDetectionService] Grayscale conversion complete');

      // Apply Gaussian blur to reduce noise
      console.log('[EdgeDetectionService] Applying Gaussian blur');
      blurred = new this.cv.Mat();
      const ksize = new this.cv.Size(finalConfig.blurKernelSize, finalConfig.blurKernelSize);
      this.cv.GaussianBlur(gray, blurred, ksize, 0);
      console.log('[EdgeDetectionService] Gaussian blur complete');

      // Apply Canny edge detection
      console.log('[EdgeDetectionService] Applying Canny edge detection');
      edges = new this.cv.Mat();
      this.cv.Canny(blurred, edges, finalConfig.cannyThreshold1, finalConfig.cannyThreshold2);
      console.log('[EdgeDetectionService] Canny edge detection complete');

      // Dilate edges to close gaps
      console.log('[EdgeDetectionService] Dilating edges');
      dilated = new this.cv.Mat();
      const kernel = this.cv.Mat.ones(3, 3, this.cv.CV_8U);
      this.cv.dilate(edges, dilated, kernel, new this.cv.Point(-1, -1), finalConfig.dilationIterations);
      kernel.delete();
      console.log('[EdgeDetectionService] Edge dilation complete');

      // Find contours
      console.log('[EdgeDetectionService] Finding contours');
      contours = new this.cv.MatVector();
      hierarchy = new this.cv.Mat();
      this.cv.findContours(
        dilated,
        contours,
        hierarchy,
        this.cv.RETR_EXTERNAL,
        this.cv.CHAIN_APPROX_SIMPLE
      );
      console.log('[EdgeDetectionService] Found', contours.size(), 'contours');

      // Find the best quadrilateral
      console.log('[EdgeDetectionService] Finding best quadrilateral');
      const result = this.findBestQuadrilateral(
        contours,
        imageData.width,
        imageData.height,
        finalConfig
      );
      console.log('[EdgeDetectionService] Best quadrilateral result:', result);

      return result;
    } catch (error) {
      console.error('[EdgeDetectionService] Edge detection failed:', error);
      return null;
    } finally {
      console.log('[EdgeDetectionService] Cleaning up resources');
      // Cleanup
      deleteMat(src, gray, blurred, edges, dilated, hierarchy);
      if (contours) contours.delete();
      console.log('[EdgeDetectionService] Cleanup complete');
    }
  }

  /**
   * Find the best quadrilateral from contours
   */
  private findBestQuadrilateral(
    contours: any,
    imageWidth: number,
    imageHeight: number,
    config: EdgeDetectionConfig
  ): DetectedEdge | null {
    const imageArea = imageWidth * imageHeight;
    const minArea = imageArea * config.minAreaRatio;
    const maxArea = imageArea * config.maxAreaRatio;

    let bestContour: DetectedEdge | null = null;
    let bestScore = 0;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);

      // Get contour area
      const area = this.cv.contourArea(contour);

      // Skip if area is too small or too large
      if (area < minArea || area > maxArea) {
        continue;
      }

      // Approximate contour to polygon
      const perimeter = this.cv.arcLength(contour, true);
      const approx = new this.cv.Mat();
      this.cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

      // We're looking for quadrilaterals (4 points)
      if (approx.rows === 4) {
        const points = this.matToPoints(approx);
        const boundingRect = this.getBoundingRect(points);
        const aspectRatio = boundingRect.width / boundingRect.height;

        // Score this quadrilateral
        const score = this.scoreQuadrilateral(points, area, aspectRatio, imageArea);

        if (score > bestScore) {
          bestScore = score;
          bestContour = {
            contour: this.orderCorners(points),
            confidence: Math.min(score / 100, 1.0),
            area,
            aspectRatio,
            boundingRect,
          };
        }
      }

      approx.delete();
    }

    return bestContour;
  }

  /**
   * Score a quadrilateral based on various factors
   */
  private scoreQuadrilateral(
    points: Point[],
    area: number,
    aspectRatio: number,
    imageArea: number
  ): number {
    let score = 0;

    // Area score (larger is better, up to a point)
    const areaRatio = area / imageArea;
    score += areaRatio * 50;

    // Aspect ratio score (prefer document-like ratios: A4 is ~1.41, letter is ~1.29)
    const targetRatios = [1.0, 1.29, 1.41, 1.5];
    const ratioScore = targetRatios.reduce((best, target) => {
      const diff = Math.abs(aspectRatio - target);
      const currentScore = Math.max(0, 25 - diff * 20);
      return Math.max(best, currentScore);
    }, 0);
    score += ratioScore;

    // Convexity score (check if it's roughly convex)
    const convexityScore = this.isRoughlyConvex(points) ? 25 : 0;
    score += convexityScore;

    return score;
  }

  /**
   * Check if quadrilateral is roughly convex
   */
  private isRoughlyConvex(points: Point[]): boolean {
    // A simple check: cross products should all have the same sign
    if (points.length !== 4) return false;

    const crossProducts = [];
    for (let i = 0; i < 4; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % 4];
      const p3 = points[(i + 2) % 4];

      const cross =
        (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
      crossProducts.push(cross);
    }

    // All should have the same sign
    const allPositive = crossProducts.every((cp) => cp > 0);
    const allNegative = crossProducts.every((cp) => cp < 0);

    return allPositive || allNegative;
  }

  /**
   * Convert cv.Mat to Point array
   */
  private matToPoints(mat: any): Point[] {
    const points: Point[] = [];
    for (let i = 0; i < mat.rows; i++) {
      const x = mat.data32S[i * 2];
      const y = mat.data32S[i * 2 + 1];
      points.push({ x, y });
    }
    return points;
  }

  /**
   * Get bounding rectangle from points
   */
  private getBoundingRect(points: Point[]): Rectangle {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Order corners: top-left, top-right, bottom-right, bottom-left
   */
  private orderCorners(points: Point[]): Point[] {
    if (points.length !== 4) {
      return points;
    }

    // Sort by y coordinate
    const sorted = [...points].sort((a, b) => a.y - b.y);

    // Top two points
    const topPoints = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
    // Bottom two points
    const bottomPoints = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

    return [
      topPoints[0],     // top-left
      topPoints[1],     // top-right
      bottomPoints[1],  // bottom-right
      bottomPoints[0],  // bottom-left
    ];
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && isOpenCVLoaded();
  }
}

// Export singleton instance
export const edgeDetectionService = new EdgeDetectionService();
