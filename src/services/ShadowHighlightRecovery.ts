import { getOpenCV } from '@/lib/opencv-loader';

/**
 * Service for shadow and highlight recovery
 *
 * Recovers detail in dark (shadow) and bright (highlight) regions
 * without affecting mid-tones. Essential for:
 * - Removing hand shadows during capture
 * - Handling uneven lighting
 * - Book spine shadows
 * - Whiteboard glare/shadows
 */
export class ShadowHighlightRecovery {
  /**
   * Recover shadow details
   *
   * Brightens dark areas while preserving mid-tones and highlights.
   * Uses local tone mapping to avoid globally brightening the image.
   *
   * @param mat - Input/output Mat (modified in place)
   * @param amount - Recovery strength (0-100, typical: 20-50)
   */
  recoverShadows(mat: any, amount: number): void {
    if (amount <= 0) return;

    const cv = getOpenCV();

    // Declare all Mats at the top for proper cleanup
    let rgb: any = null;
    let lab: any = null;
    let channels: any = null;
    let l: any = null;
    let shadowMask: any = null;
    let corrected: any = null;
    let blended: any = null;
    let lFloat: any = null;
    let lFloat2: any = null;
    let correctedFloat: any = null;
    let invMask: any = null;
    let originalWeighted: any = null;
    let correctedWeighted: any = null;
    let blendedFloat: any = null;

    try {
      // Convert to LAB color space (L = luminance, AB = color)
      rgb = new cv.Mat();
      if (mat.channels() === 4) {
        cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);
      } else {
        mat.copyTo(rgb);
      }

      lab = new cv.Mat();
      cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);

      // Split channels
      channels = new cv.MatVector();
      cv.split(lab, channels);

      l = new cv.Mat();
      channels.get(0).copyTo(l);

      // Create shadow mask (luminance < 80)
      // Soft transition from 40 (full recovery) to 120 (no recovery)
      shadowMask = new cv.Mat();
      cv.threshold(l, shadowMask, 80, 255, cv.THRESH_BINARY_INV);

      // Apply Gaussian blur to mask for smooth transition
      cv.GaussianBlur(shadowMask, shadowMask, new cv.Size(15, 15), 0);

      // Normalize mask to 0-1 range
      shadowMask.convertTo(shadowMask, cv.CV_32F, 1.0 / 255.0);

      // Calculate correction strength (stronger for darker areas)
      // Scale by amount parameter (0-100)
      const maxCorrection = (amount / 100) * 80; // Up to +80 luminance

      // Apply local histogram equalization to shadows
      lFloat = new cv.Mat();
      l.convertTo(lFloat, cv.CV_32F);

      // Calculate target luminance for shadows
      // Use gamma correction to lift shadows
      const gamma = 1.0 + (amount / 100) * 0.8; // Gamma up to 1.8
      const lookupTable = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        lookupTable[i] = Math.pow(i / 255.0, 1.0 / gamma) * 255.0;
      }

      // Apply lookup table
      const data = lFloat.data32F;
      for (let i = 0; i < data.length; i++) {
        const value = Math.round(data[i]);
        if (value >= 0 && value < 256) {
          data[i] = lookupTable[value];
        }
      }

      corrected = new cv.Mat();
      lFloat.convertTo(corrected, l.type());

      // Blend original and corrected using shadow mask
      lFloat2 = new cv.Mat();
      correctedFloat = new cv.Mat();
      l.convertTo(lFloat2, cv.CV_32F);
      corrected.convertTo(correctedFloat, cv.CV_32F);

      // Weighted blend: blended = original * (1 - mask) + corrected * mask
      invMask = new cv.Mat();
      cv.subtract(new cv.Scalar(1.0), shadowMask, invMask);

      originalWeighted = new cv.Mat();
      correctedWeighted = new cv.Mat();

      cv.multiply(lFloat2, invMask, originalWeighted);
      cv.multiply(correctedFloat, shadowMask, correctedWeighted);

      blendedFloat = new cv.Mat();
      cv.add(originalWeighted, correctedWeighted, blendedFloat);

      blended = new cv.Mat();
      blendedFloat.convertTo(blended, l.type());

      // Replace L channel with corrected version
      blended.copyTo(channels.get(0));

      // Merge channels back
      cv.merge(channels, lab);

      // Convert back to RGB
      cv.cvtColor(lab, rgb, cv.COLOR_Lab2RGB);

      // Convert to original format
      if (mat.channels() === 4) {
        cv.cvtColor(rgb, mat, cv.COLOR_RGB2RGBA);
      } else {
        rgb.copyTo(mat);
      }
    } finally {
      // Cleanup all Mats in finally block to ensure cleanup even on error
      if (rgb && rgb.delete) rgb.delete();
      if (lab && lab.delete) lab.delete();
      if (channels && channels.delete) channels.delete();
      if (l && l.delete) l.delete();
      if (shadowMask && shadowMask.delete) shadowMask.delete();
      if (corrected && corrected.delete) corrected.delete();
      if (blended && blended.delete) blended.delete();
      if (lFloat && lFloat.delete) lFloat.delete();
      if (lFloat2 && lFloat2.delete) lFloat2.delete();
      if (correctedFloat && correctedFloat.delete) correctedFloat.delete();
      if (invMask && invMask.delete) invMask.delete();
      if (originalWeighted && originalWeighted.delete) originalWeighted.delete();
      if (correctedWeighted && correctedWeighted.delete) correctedWeighted.delete();
      if (blendedFloat && blendedFloat.delete) blendedFloat.delete();
    }
  }

  /**
   * Recover highlight details
   *
   * Darkens and recovers detail in bright areas while preserving
   * mid-tones and shadows.
   *
   * @param mat - Input/output Mat (modified in place)
   * @param amount - Recovery strength (0-100, typical: 15-40)
   */
  recoverHighlights(mat: any, amount: number): void {
    if (amount <= 0) return;

    const cv = getOpenCV();

    // Declare all Mats at the top for proper cleanup
    let rgb: any = null;
    let lab: any = null;
    let channels: any = null;
    let l: any = null;
    let highlightMask: any = null;
    let corrected: any = null;
    let blended: any = null;
    let lFloat: any = null;
    let lFloat2: any = null;
    let correctedFloat: any = null;
    let invMask: any = null;
    let originalWeighted: any = null;
    let correctedWeighted: any = null;
    let blendedFloat: any = null;

    try {
      // Convert to LAB
      rgb = new cv.Mat();
      if (mat.channels() === 4) {
        cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);
      } else {
        mat.copyTo(rgb);
      }

      lab = new cv.Mat();
      cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);

      // Split channels
      channels = new cv.MatVector();
      cv.split(lab, channels);

      l = new cv.Mat();
      channels.get(0).copyTo(l);

      // Create highlight mask (luminance > 200)
      // Soft transition from 200 (full recovery) to 140 (no recovery)
      highlightMask = new cv.Mat();
      cv.threshold(l, highlightMask, 200, 255, cv.THRESH_BINARY);

      // Blur for smooth transition
      cv.GaussianBlur(highlightMask, highlightMask, new cv.Size(15, 15), 0);

      // Normalize to 0-1
      highlightMask.convertTo(highlightMask, cv.CV_32F, 1.0 / 255.0);

      // Apply compression to highlights
      // Use inverse gamma to compress highlights
      const gamma = 1.0 + (amount / 100) * 1.2; // Gamma up to 2.2
      const lookupTable = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        lookupTable[i] = Math.pow(i / 255.0, gamma) * 255.0;
      }

      // Apply lookup table
      lFloat = new cv.Mat();
      l.convertTo(lFloat, cv.CV_32F);

      const data = lFloat.data32F;
      for (let i = 0; i < data.length; i++) {
        const value = Math.round(data[i]);
        if (value >= 0 && value < 256) {
          data[i] = lookupTable[value];
        }
      }

      corrected = new cv.Mat();
      lFloat.convertTo(corrected, l.type());

      // Blend original and corrected using highlight mask
      lFloat2 = new cv.Mat();
      correctedFloat = new cv.Mat();
      l.convertTo(lFloat2, cv.CV_32F);
      corrected.convertTo(correctedFloat, cv.CV_32F);

      invMask = new cv.Mat();
      cv.subtract(new cv.Scalar(1.0), highlightMask, invMask);

      originalWeighted = new cv.Mat();
      correctedWeighted = new cv.Mat();

      cv.multiply(lFloat2, invMask, originalWeighted);
      cv.multiply(correctedFloat, highlightMask, correctedWeighted);

      blendedFloat = new cv.Mat();
      cv.add(originalWeighted, correctedWeighted, blendedFloat);

      blended = new cv.Mat();
      blendedFloat.convertTo(blended, l.type());

      // Replace L channel
      blended.copyTo(channels.get(0));

      // Merge back
      cv.merge(channels, lab);

      // Convert back to RGB
      cv.cvtColor(lab, rgb, cv.COLOR_Lab2RGB);

      // Convert to original format
      if (mat.channels() === 4) {
        cv.cvtColor(rgb, mat, cv.COLOR_RGB2RGBA);
      } else {
        rgb.copyTo(mat);
      }
    } finally {
      // Cleanup all Mats in finally block to ensure cleanup even on error
      if (rgb && rgb.delete) rgb.delete();
      if (lab && lab.delete) lab.delete();
      if (channels && channels.delete) channels.delete();
      if (l && l.delete) l.delete();
      if (highlightMask && highlightMask.delete) highlightMask.delete();
      if (corrected && corrected.delete) corrected.delete();
      if (blended && blended.delete) blended.delete();
      if (lFloat && lFloat.delete) lFloat.delete();
      if (lFloat2 && lFloat2.delete) lFloat2.delete();
      if (correctedFloat && correctedFloat.delete) correctedFloat.delete();
      if (invMask && invMask.delete) invMask.delete();
      if (originalWeighted && originalWeighted.delete) originalWeighted.delete();
      if (correctedWeighted && correctedWeighted.delete) correctedWeighted.delete();
      if (blendedFloat && blendedFloat.delete) blendedFloat.delete();
    }
  }

  /**
   * Apply both shadow and highlight recovery
   * Convenience method to apply both in optimal order
   *
   * @param mat - Input/output Mat (modified in place)
   * @param shadowAmount - Shadow recovery strength (0-100)
   * @param highlightAmount - Highlight recovery strength (0-100)
   */
  recover(mat: any, shadowAmount: number, highlightAmount: number): void {
    // Apply shadow recovery first
    if (shadowAmount > 0) {
      this.recoverShadows(mat, shadowAmount);
    }

    // Then highlight recovery
    if (highlightAmount > 0) {
      this.recoverHighlights(mat, highlightAmount);
    }
  }

  /**
   * Adaptive recovery based on image analysis
   * Automatically determines optimal shadow/highlight recovery amounts
   *
   * @param mat - Input/output Mat (modified in place)
   * @param strength - Overall recovery strength (0-100, default: 50)
   */
  adaptiveRecover(mat: any, strength: number = 50): void {
    const cv = getOpenCV();
    const lab = new cv.Mat();
    const channels = new cv.MatVector();

    try {
      // Convert to LAB to analyze luminance
      let rgb = new cv.Mat();
      if (mat.channels() === 4) {
        cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);
      } else {
        mat.copyTo(rgb);
      }

      cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
      cv.split(lab, channels);

      const l = channels.get(0);

      // Calculate histogram
      const hist = new cv.Mat();
      const histSize = [256];
      const ranges = [0, 256];
      cv.calcHist(new cv.MatVector([l]), [0], new cv.Mat(), hist, histSize, ranges, false);

      const histData = Array.from(hist.data32F) as number[];
      const totalPixels = histData.reduce((sum, count) => sum + count, 0);

      // Calculate shadow percentage (luminance < 80)
      const shadowPixels = histData.slice(0, 80).reduce((sum, count) => sum + count, 0);
      const shadowPercentage = (shadowPixels / totalPixels) * 100;

      // Calculate highlight percentage (luminance > 200)
      const highlightPixels = histData.slice(200).reduce((sum, count) => sum + count, 0);
      const highlightPercentage = (highlightPixels / totalPixels) * 100;

      // Determine recovery amounts based on analysis
      const shadowAmount = Math.min(100, shadowPercentage * 1.5) * (strength / 100);
      const highlightAmount = Math.min(80, highlightPercentage * 2.0) * (strength / 100);

      // Cleanup
      hist.delete();
      rgb.delete();

      // Apply recovery
      this.recover(mat, shadowAmount, highlightAmount);
    } finally {
      lab.delete();
      channels.delete();
    }
  }
}

// Export singleton instance
export const shadowHighlightRecovery = new ShadowHighlightRecovery();
