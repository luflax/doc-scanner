import { getOpenCV } from '@/lib/opencv-loader';

/**
 * Service for applying unsharp mask sharpening
 *
 * Unsharp masking is a professional sharpening technique that:
 * 1. Creates a blurred version of the image
 * 2. Subtracts it from the original to get detail
 * 3. Adds the detail back multiplied by an amount
 *
 * This produces crisp results without halos or artifacts when used correctly.
 */
export class UnsharpMask {
  /**
   * Apply unsharp mask sharpening to a Mat
   *
   * @param mat - Input/output Mat (modified in place)
   * @param amount - Sharpening strength (0-2, typical: 0.3-0.8)
   * @param radius - Blur radius in pixels (0.5-4.0, typical: 1.0-2.0)
   * @param threshold - Minimum brightness change to sharpen (0-255, typical: 0-5)
   */
  sharpen(mat: any, amount: number = 0.5, radius: number = 1.5, threshold: number = 0): void {
    const cv = getOpenCV();
    const blurred = new cv.Mat();
    const detail = new cv.Mat();
    const sharpened = new cv.Mat();

    try {
      // 1. Create blurred version using Gaussian blur
      // Convert radius to sigma (sigma = radius * 0.5)
      const sigma = radius * 0.5;
      cv.GaussianBlur(mat, blurred, new cv.Size(0, 0), sigma, sigma);

      // 2. Calculate detail mask: original - blurred
      cv.subtract(mat, blurred, detail);

      // 3. Apply threshold if specified
      // Only sharpen pixels with detail above threshold
      if (threshold > 0) {
        const mask = new cv.Mat();
        const detailGray = new cv.Mat();

        // Convert detail to grayscale for thresholding
        if (detail.channels() > 1) {
          cv.cvtColor(detail, detailGray, cv.COLOR_RGBA2GRAY);
        } else {
          detail.copyTo(detailGray);
        }

        // Create mask of pixels above threshold
        cv.threshold(detailGray, mask, threshold, 255, cv.THRESH_BINARY);

        // Apply mask to detail
        detail.setTo(new cv.Scalar(0, 0, 0, 0), mask);

        mask.delete();
        detailGray.delete();
      }

      // 4. Add detail * amount back to original
      // sharpened = original + detail * amount
      cv.addWeighted(mat, 1.0, detail, amount, 0, sharpened);

      // 5. Copy result back to input mat
      sharpened.copyTo(mat);
    } finally {
      // Cleanup
      blurred.delete();
      detail.delete();
      sharpened.delete();
    }
  }

  /**
   * Apply adaptive unsharp mask that varies strength based on local contrast
   * Good for images with both soft and sharp areas
   *
   * @param mat - Input/output Mat (modified in place)
   * @param amount - Maximum sharpening strength (0-2)
   * @param radius - Blur radius in pixels (0.5-4.0)
   */
  sharpenAdaptive(mat: any, amount: number = 0.5, radius: number = 1.5): void {
    const cv = getOpenCV();
    const blurred = new cv.Mat();
    const detail = new cv.Mat();
    const localContrast = new cv.Mat();
    const adaptiveDetail = new cv.Mat();
    const sharpened = new cv.Mat();

    try {
      // 1. Create blurred version
      const sigma = radius * 0.5;
      cv.GaussianBlur(mat, blurred, new cv.Size(0, 0), sigma, sigma);

      // 2. Calculate detail mask
      cv.subtract(mat, blurred, detail);

      // 3. Calculate local contrast (variance in local neighborhood)
      const gray = new cv.Mat();
      if (mat.channels() > 1) {
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
      } else {
        mat.copyTo(gray);
      }

      // Local standard deviation as measure of local contrast
      const grayFloat = new cv.Mat();
      gray.convertTo(grayFloat, cv.CV_32F);

      const mean = new cv.Mat();
      const sqMean = new cv.Mat();
      const variance = new cv.Mat();

      const ksize = 5;
      cv.blur(grayFloat, mean, new cv.Size(ksize, ksize));

      cv.multiply(grayFloat, grayFloat, sqMean);
      cv.blur(sqMean, sqMean, new cv.Size(ksize, ksize));

      cv.subtract(sqMean, mean, variance);
      cv.multiply(mean, mean, mean);
      cv.subtract(variance, mean, variance);

      cv.sqrt(variance, localContrast);

      // Normalize to 0-1 range for use as multiplier
      cv.normalize(localContrast, localContrast, 0, 1, cv.NORM_MINMAX);

      // 4. Scale detail by local contrast
      // Areas with low contrast get less sharpening
      // Convert detail to float for multiplication
      const detailFloat = new cv.Mat();
      detail.convertTo(detailFloat, cv.CV_32F);

      // Expand contrast to match detail channels
      if (detail.channels() > 1) {
        const contrastChannels = [];
        for (let i = 0; i < detail.channels(); i++) {
          contrastChannels.push(localContrast);
        }
        const contrastMulti = new cv.Mat();
        cv.merge(contrastChannels, contrastMulti);
        cv.multiply(detailFloat, contrastMulti, detailFloat, amount);
        contrastMulti.delete();
      } else {
        cv.multiply(detailFloat, localContrast, detailFloat, amount);
      }

      detailFloat.convertTo(adaptiveDetail, mat.type());

      // 5. Add adaptive detail to original
      cv.add(mat, adaptiveDetail, sharpened);

      // 6. Copy result back
      sharpened.copyTo(mat);

      // Cleanup additional mats
      gray.delete();
      grayFloat.delete();
      mean.delete();
      sqMean.delete();
      variance.delete();
      detailFloat.delete();
    } finally {
      // Cleanup
      blurred.delete();
      detail.delete();
      localContrast.delete();
      adaptiveDetail.delete();
      sharpened.delete();
    }
  }

  /**
   * Apply edge-aware sharpening (good for documents)
   * Only sharpens edges, avoids noise amplification in flat areas
   *
   * @param mat - Input/output Mat (modified in place)
   * @param amount - Sharpening strength (0-2)
   */
  sharpenEdgeAware(mat: any, amount: number = 0.6): void {
    const cv = getOpenCV();
    const gray = new cv.Mat();
    const edges = new cv.Mat();
    const edgeMask = new cv.Mat();
    const blurred = new cv.Mat();
    const detail = new cv.Mat();
    const maskedDetail = new cv.Mat();
    const sharpened = new cv.Mat();

    try {
      // 1. Detect edges
      if (mat.channels() > 1) {
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
      } else {
        mat.copyTo(gray);
      }

      // Use Canny edge detection
      cv.Canny(gray, edges, 30, 90);

      // Dilate edges to create mask
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      cv.dilate(edges, edgeMask, kernel);
      kernel.delete();

      // 2. Create unsharp mask
      cv.GaussianBlur(mat, blurred, new cv.Size(0, 0), 1.0);
      cv.subtract(mat, blurred, detail);

      // 3. Apply edge mask to detail
      // Convert mask to proper format
      if (detail.channels() > 1) {
        const maskMulti = new cv.Mat();
        cv.cvtColor(edgeMask, maskMulti, cv.COLOR_GRAY2RGBA);
        cv.bitwise_and(detail, maskMulti, maskedDetail);
        maskMulti.delete();
      } else {
        cv.bitwise_and(detail, edgeMask, maskedDetail);
      }

      // 4. Add masked detail to original
      cv.addWeighted(mat, 1.0, maskedDetail, amount, 0, sharpened);

      // 5. Copy result back
      sharpened.copyTo(mat);
    } finally {
      // Cleanup
      gray.delete();
      edges.delete();
      edgeMask.delete();
      blurred.delete();
      detail.delete();
      maskedDetail.delete();
      sharpened.delete();
    }
  }
}

// Export singleton instance
export const unsharpMask = new UnsharpMask();
