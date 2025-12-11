import { getOpenCV, imageDataToMat, matToImageData, deleteMat, isOpenCVLoaded } from '@/lib/opencv-loader';
import type { Point, PerspectiveConfig, TransformResult } from '@/types';

export class PerspectiveCorrectionService {
  /**
   * Apply perspective correction to image based on corner points
   */
  async correctPerspective(
    imageData: ImageData,
    corners: Point[],
    config?: Partial<PerspectiveConfig>
  ): Promise<TransformResult | null> {
    if (!isOpenCVLoaded()) {
      throw new Error('OpenCV not loaded');
    }

    if (corners.length !== 4) {
      throw new Error('Exactly 4 corners required');
    }

    const defaultConfig: PerspectiveConfig = {
      outputWidth: 0,
      outputHeight: 0,
      preserveAspectRatio: true,
      interpolation: 'linear',
    };

    const finalConfig = { ...defaultConfig, ...config };

    let src: any = null;
    let dst: any = null;
    let M: any = null;

    try {
      const cv = getOpenCV();

      // Convert ImageData to Mat
      src = imageDataToMat(imageData);

      // Calculate output dimensions
      const outputDimensions =
        finalConfig.outputWidth && finalConfig.outputHeight
          ? { width: finalConfig.outputWidth, height: finalConfig.outputHeight }
          : this.calculateOutputDimensions(corners);

      // Order corners: top-left, top-right, bottom-right, bottom-left
      const orderedCorners = this.ensureCornerOrder(corners);

      // Source points (detected corners)
      const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        orderedCorners[0].x, orderedCorners[0].y,
        orderedCorners[1].x, orderedCorners[1].y,
        orderedCorners[2].x, orderedCorners[2].y,
        orderedCorners[3].x, orderedCorners[3].y,
      ]);

      // Destination points (rectangle corners)
      const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        outputDimensions.width, 0,
        outputDimensions.width, outputDimensions.height,
        0, outputDimensions.height,
      ]);

      // Compute perspective transform matrix
      M = cv.getPerspectiveTransform(srcPoints, dstPoints);

      // Apply perspective warp
      dst = new cv.Mat();
      const dsize = new cv.Size(outputDimensions.width, outputDimensions.height);

      const interpolationFlag = this.getInterpolationFlag(finalConfig.interpolation);

      cv.warpPerspective(
        src,
        dst,
        M,
        dsize,
        interpolationFlag,
        cv.BORDER_CONSTANT,
        new cv.Scalar(255, 255, 255, 255)
      );

      // Convert result back to ImageData
      const correctedImage = matToImageData(dst);

      // Extract transform matrix as 2D array
      const transformMatrix = this.matrixToArray(M);

      srcPoints.delete();
      dstPoints.delete();

      return {
        correctedImage,
        transformMatrix,
        originalCorners: orderedCorners,
        outputDimensions,
      };
    } catch (error) {
      console.error('Perspective correction failed:', error);
      return null;
    } finally {
      deleteMat(src, dst, M);
    }
  }

  /**
   * Calculate optimal output dimensions based on corner points
   */
  calculateOutputDimensions(corners: Point[]): { width: number; height: number } {
    if (corners.length !== 4) {
      throw new Error('Exactly 4 corners required');
    }

    const orderedCorners = this.ensureCornerOrder(corners);

    // Calculate distances
    const topWidth = this.distance(orderedCorners[0], orderedCorners[1]);
    const bottomWidth = this.distance(orderedCorners[3], orderedCorners[2]);
    const leftHeight = this.distance(orderedCorners[0], orderedCorners[3]);
    const rightHeight = this.distance(orderedCorners[1], orderedCorners[2]);

    // Use maximum dimensions
    const width = Math.max(topWidth, bottomWidth);
    const height = Math.max(leftHeight, rightHeight);

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Ensure corners are ordered: top-left, top-right, bottom-right, bottom-left
   */
  private ensureCornerOrder(points: Point[]): Point[] {
    if (points.length !== 4) {
      return points;
    }

    // Calculate centroid
    const centroid = {
      x: points.reduce((sum, p) => sum + p.x, 0) / 4,
      y: points.reduce((sum, p) => sum + p.y, 0) / 4,
    };

    // Sort points by angle from centroid
    const sorted = [...points].sort((a, b) => {
      const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
      const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
      return angleA - angleB;
    });

    // Find top-left point (minimum x + y)
    const sums = sorted.map((p) => p.x + p.y);
    const topLeftIndex = sums.indexOf(Math.min(...sums));

    // Reorder starting from top-left, going clockwise
    const ordered = [
      sorted[topLeftIndex],
      sorted[(topLeftIndex + 1) % 4],
      sorted[(topLeftIndex + 2) % 4],
      sorted[(topLeftIndex + 3) % 4],
    ];

    return ordered;
  }

  /**
   * Get OpenCV interpolation flag from string
   */
  private getInterpolationFlag(interpolation: string): number {
    const cv = getOpenCV();

    switch (interpolation) {
      case 'nearest':
        return cv.INTER_NEAREST;
      case 'linear':
        return cv.INTER_LINEAR;
      case 'cubic':
        return cv.INTER_CUBIC;
      case 'lanczos':
        return cv.INTER_LANCZOS4;
      default:
        return cv.INTER_LINEAR;
    }
  }

  /**
   * Convert cv.Mat to 2D array
   */
  private matrixToArray(mat: any): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < mat.rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < mat.cols; j++) {
        row.push(mat.data64F[i * mat.cols + j]);
      }
      result.push(row);
    }
    return result;
  }
}

// Export singleton instance
export const perspectiveCorrectionService = new PerspectiveCorrectionService();
