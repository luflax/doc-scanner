import { imageDataToMat, matToImageData, deleteMat, isOpenCVLoaded } from '@/lib/opencv-loader';
import type { EnhancementOptions, FilterPreset, AutoEnhanceResult } from '@/types';
import { histogramAnalyzer } from './HistogramAnalyzer';
import { unsharpMask } from './UnsharpMask';
import { whiteBalanceCorrector } from './WhiteBalanceCorrector';
import { shadowHighlightRecovery } from './ShadowHighlightRecovery';

export class ImageEnhancementService {
  private cv: any = null;
  private isInitialized = false;

  /**
   * Initialize the enhancement service by loading OpenCV
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.cv = (window.cv instanceof Promise) ? await window.cv : window.cv;
      this.isInitialized = true;
      console.log('ImageEnhancementService initialized');
    } catch (error) {
      console.error('Failed to initialize ImageEnhancementService:', error);
      throw error;
    }
  }

  /**
   * Auto-enhance image using intelligent analysis
   */
  async autoEnhance(imageData: ImageData): Promise<AutoEnhanceResult | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let src: any = null;
    let result: any = null;

    try {
      // Analyze image
      const analysis = histogramAnalyzer.analyzeImage(imageData);
      const recommendations = histogramAnalyzer.recommendEnhancements(analysis);

      // Convert to Mat
      src = imageDataToMat(imageData);
      result = src.clone();

      // Apply auto white balance if color cast detected
      if (analysis.hasColorCast && analysis.colorCastStrength > 15) {
        whiteBalanceCorrector.smartBalance(result);
      }

      // Apply shadow/highlight recovery
      if (recommendations.shadows > 0 || recommendations.highlights > 0) {
        shadowHighlightRecovery.recover(result, recommendations.shadows, recommendations.highlights);
      }

      // Apply CLAHE for contrast enhancement
      if (result.channels() >= 3) {
        this.applyCLAHE(result);
      }

      // Apply brightness and contrast adjustments
      if (recommendations.brightness !== 0 || recommendations.contrast !== 0) {
        const alpha = 1 + (recommendations.contrast / 100);
        const beta = (recommendations.brightness / 100) * 255;
        result.convertTo(result, -1, alpha, beta);
      }

      // Apply saturation adjustment
      if (recommendations.saturation !== 0) {
        this.applySaturation(result, recommendations.saturation);
      }

      // Apply sharpening
      unsharpMask.sharpen(result, 0.4, 1.5, 0);

      // Get enhanced histogram
      const enhancedImageData = matToImageData(result);
      const enhancedHistogram = histogramAnalyzer.analyzeImage(enhancedImageData).histogram;

      return {
        enhancedImage: enhancedImageData,
        appliedSettings: {
          brightness: recommendations.brightness,
          contrast: recommendations.contrast,
          saturation: recommendations.saturation,
          sharpness: 40, // 0.4 amount * 100
          gamma: 1.0,
          shadows: recommendations.shadows,
          highlights: recommendations.highlights,
          temperature: 0,
        },
        originalHistogram: analysis.histogram,
        enhancedHistogram,
      };
    } catch (error) {
      console.error('Auto-enhancement failed:', error);
      return null;
    } finally {
      deleteMat(src, result);
    }
  }

  /**
   * Apply manual enhancement adjustments
   */
  async enhance(imageData: ImageData, options: EnhancementOptions): Promise<ImageData | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let src: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);
      result = src.clone();

      // Apply shadow/highlight recovery first (if specified)
      if (options.shadows > 0 || options.highlights > 0) {
        shadowHighlightRecovery.recover(result, options.shadows, options.highlights);
      }

      // Apply temperature adjustment
      if (options.temperature !== 0) {
        whiteBalanceCorrector.adjustTemperature(result, options.temperature);
      }

      // Apply brightness and contrast
      if (options.brightness !== 0 || options.contrast !== 0) {
        const alpha = 1 + (options.contrast / 100); // Contrast multiplier
        const beta = (options.brightness / 100) * 255; // Brightness offset
        result.convertTo(result, -1, alpha, beta);
      }

      // Apply gamma correction
      if (options.gamma !== 1.0) {
        this.applyGamma(result, options.gamma);
      }

      // Apply saturation adjustment
      if (options.saturation !== 0) {
        this.applySaturation(result, options.saturation);
      }

      // Apply sharpening (if specified)
      if (options.sharpness > 0) {
        const amount = options.sharpness / 100; // Convert to 0-1 range
        unsharpMask.sharpen(result, amount, 1.5, 0);
      }

      return matToImageData(result);
    } catch (error) {
      console.error('Enhancement failed:', error);
      return null;
    } finally {
      deleteMat(src, result);
    }
  }

  /**
   * Apply a filter preset
   */
  async applyFilter(imageData: ImageData, preset: FilterPreset): Promise<ImageData | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    switch (preset) {
      case 'original':
        return imageData;
      case 'grayscale':
        return this.applyGrayscale(imageData);
      case 'document':
        return this.applyDocumentFilter(imageData);
      case 'magic':
        return this.applyMagicFilter(imageData);
      case 'whiteboard':
        return this.applyWhiteboardFilter(imageData);
      case 'book':
        return this.applyBookFilter(imageData);
      case 'receipt':
        return this.applyReceiptFilter(imageData);
      case 'photo':
        return this.applyPhotoFilter(imageData);
      case 'blueprint':
        return this.applyBlueprintFilter(imageData);
      default:
        return imageData;
    }
  }

  /**
   * Grayscale filter
   */
  private applyGrayscale(imageData: ImageData): ImageData | null {
    let src: any = null;
    let gray: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);
      gray = new this.cv.Mat();

      // Convert to grayscale
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Convert back to RGBA for display
      result = new this.cv.Mat();
      this.cv.cvtColor(gray, result, this.cv.COLOR_GRAY2RGBA);

      // Increase contrast slightly
      result.convertTo(result, -1, 1.1, 5);

      // Apply sharpening
      unsharpMask.sharpen(result, 0.3, 1.5, 0);

      return matToImageData(result);
    } catch (error) {
      console.error('Grayscale filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, result);
    }
  }

  /**
   * Document filter - High contrast black and white with adaptive threshold
   */
  private applyDocumentFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let gray: any = null;
    let denoised: any = null;
    let threshold: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);
      gray = new this.cv.Mat();

      // Apply auto white balance first
      whiteBalanceCorrector.autoWhiteBalance(src);

      // Apply shadow recovery
      shadowHighlightRecovery.recoverShadows(src, 40);

      // Convert to grayscale
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Apply bilateral filter (faster than fastNlMeansDenoising)
      denoised = new this.cv.Mat();
      this.cv.bilateralFilter(gray, denoised, 5, 50, 50);

      // Apply adaptive threshold
      threshold = new this.cv.Mat();
      this.cv.adaptiveThreshold(
        denoised,
        threshold,
        255,
        this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        this.cv.THRESH_BINARY,
        11,
        2
      );

      // Morphological cleaning to remove small noise
      const kernel = this.cv.getStructuringElement(this.cv.MORPH_RECT, new this.cv.Size(2, 2));
      this.cv.morphologyEx(threshold, threshold, this.cv.MORPH_CLOSE, kernel);
      kernel.delete();

      // Convert back to RGBA
      result = new this.cv.Mat();
      this.cv.cvtColor(threshold, result, this.cv.COLOR_GRAY2RGBA);

      // Apply sharpening
      unsharpMask.sharpenEdgeAware(result, 0.5);

      return matToImageData(result);
    } catch (error) {
      console.error('Document filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, denoised, threshold, result);
    }
  }

  /**
   * Magic filter - Document background normalization (CamScanner Enhanced style)
   *
   * Core technique: estimate the local background illumination via a large Gaussian
   * blur, then divide every pixel by its background estimate. Background pixels
   * (paper) normalize to ~255 (pure white); text pixels become proportionally dark.
   * A tone curve clamps the result and a mild LAB desaturation removes the paper
   * colour cast.
   */
  private applyMagicFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let srcRgb: any = null;
    let bgEstimate: any = null;
    let src32f: any = null;
    let bg32f: any = null;
    let normalized32f: any = null;
    let result8u: any = null;
    let labMat: any = null;
    let labChannels: any = null;
    let resultRGBA: any = null;

    try {
      // A. Load image and strip alpha channel
      src = imageDataToMat(imageData);
      srcRgb = new this.cv.Mat();
      this.cv.cvtColor(src, srcRgb, this.cv.COLOR_RGBA2RGB);

      // B. Estimate background illumination with a large Gaussian blur.
      //    Sigma is ~4% of the largest image dimension so the kernel spans
      //    the whole page and blurs away text while capturing slow lighting
      //    gradients (shadows, page curl, uneven illumination).
      const sigma = Math.max(srcRgb.rows, srcRgb.cols) * 0.04;
      bgEstimate = new this.cv.Mat();
      this.cv.GaussianBlur(
        srcRgb, bgEstimate,
        new this.cv.Size(0, 0), sigma, sigma,
        this.cv.BORDER_REFLECT_101,
      );

      // C. Convert both source and background to float for accurate division.
      //    Apply an epsilon floor to the background to prevent divide-by-zero.
      src32f = new this.cv.Mat();
      srcRgb.convertTo(src32f, this.cv.CV_32F);

      bg32f = new this.cv.Mat();
      bgEstimate.convertTo(bg32f, this.cv.CV_32F);

      const epsMat = new this.cv.Mat(bg32f.rows, bg32f.cols, bg32f.type());
      epsMat.setTo(new this.cv.Scalar(1.0, 1.0, 1.0));
      this.cv.max(bg32f, epsMat, bg32f);
      epsMat.delete();

      // D. Illumination normalization: pixel / background * 255.
      //    Background pixels → ~255 (white); text pixels → proportionally dark.
      //    Values above 255 (specular highlights) are clipped in step E.
      normalized32f = new this.cv.Mat();
      this.cv.divide(src32f, bg32f, normalized32f, 255.0);

      // E. Tone curve: push near-whites firmly to 255, keep darks dark.
      //    Derivation: background normalises to ~220 after division, so
      //    1.15 * 220 + 2 ≈ 255. convertTo clips overflow to 255 for CV_8U.
      result8u = new this.cv.Mat();
      normalized32f.convertTo(result8u, this.cv.CV_8U, 1.15, 2);

      // F. Colour cast removal in LAB space.
      //    Blend A and B channels 75 % original / 25 % neutral (128) to reduce
      //    the warm/teal paper tint without desaturating ink colours visibly.
      labMat = new this.cv.Mat();
      this.cv.cvtColor(result8u, labMat, this.cv.COLOR_RGB2Lab);

      labChannels = new this.cv.MatVector();
      this.cv.split(labMat, labChannels);

      const neutral128 = new this.cv.Mat(
        labChannels.get(1).rows, labChannels.get(1).cols,
        labChannels.get(1).type(),
      );
      neutral128.setTo(new this.cv.Scalar(128));

      const aResult = new this.cv.Mat();
      const bResult = new this.cv.Mat();
      this.cv.addWeighted(labChannels.get(1), 0.75, neutral128, 0.25, 0, aResult);
      this.cv.addWeighted(labChannels.get(2), 0.75, neutral128, 0.25, 0, bResult);
      aResult.copyTo(labChannels.get(1));
      bResult.copyTo(labChannels.get(2));
      aResult.delete();
      bResult.delete();
      neutral128.delete();

      this.cv.merge(labChannels, labMat);
      this.cv.cvtColor(labMat, result8u, this.cv.COLOR_Lab2RGB);

      // G. Convert back to RGBA
      resultRGBA = new this.cv.Mat();
      this.cv.cvtColor(result8u, resultRGBA, this.cv.COLOR_RGB2RGBA);

      // H. Mild sharpening to crisp up text edges.
      //    Lighter parameters than before — normalization already creates
      //    strong edge contrast so heavy sharpening would cause haloing.
      unsharpMask.sharpen(resultRGBA, 0.3, 1.2, 0);

      return matToImageData(resultRGBA);
    } catch (error) {
      console.error('Magic filter failed:', error);
      return null;
    } finally {
      deleteMat(src, srcRgb, bgEstimate, src32f, bg32f, normalized32f, result8u, labMat, resultRGBA);
      if (labChannels) {
        try { labChannels.delete(); } catch (_) {}
      }
    }
  }

  /**
   * Whiteboard filter - Optimized for whiteboards with shadow removal
   */
  private applyWhiteboardFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let gray: any = null;
    let blurred: any = null;
    let threshold: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);

      // Apply auto white balance with cool temperature
      whiteBalanceCorrector.autoWhiteBalance(src);
      whiteBalanceCorrector.adjustTemperature(src, -10);

      // Apply strong shadow recovery (key improvement)
      shadowHighlightRecovery.recoverShadows(src, 50);

      // Convert to grayscale
      gray = new this.cv.Mat();
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Apply bilateral filter
      const denoised = new this.cv.Mat();
      this.cv.bilateralFilter(gray, denoised, 5, 60, 60);

      // Blur to reduce noise
      blurred = new this.cv.Mat();
      this.cv.GaussianBlur(denoised, blurred, new this.cv.Size(3, 3), 0);
      denoised.delete();

      // Adaptive threshold with larger block size for whiteboards
      threshold = new this.cv.Mat();
      this.cv.adaptiveThreshold(
        blurred,
        threshold,
        255,
        this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        this.cv.THRESH_BINARY,
        21,
        10
      );

      // Convert back to RGBA
      result = new this.cv.Mat();
      this.cv.cvtColor(threshold, result, this.cv.COLOR_GRAY2RGBA);

      // Brighten slightly
      result.convertTo(result, -1, 1.0, 10);

      // Apply sharpening
      unsharpMask.sharpenEdgeAware(result, 0.6);

      return matToImageData(result);
    } catch (error) {
      console.error('Whiteboard filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, blurred, threshold, result);
    }
  }

  /**
   * Book filter - Optimized for book pages with better denoising
   */
  private applyBookFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let gray: any = null;
    let denoised: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);

      // Apply shadow recovery for book spine shadows
      shadowHighlightRecovery.recoverShadows(src, 35);

      // Convert to grayscale
      gray = new this.cv.Mat();
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Apply bilateral filter (much faster than fastNlMeansDenoising)
      denoised = new this.cv.Mat();
      this.cv.bilateralFilter(gray, denoised, 5, 50, 50);

      // Convert back to RGBA
      result = new this.cv.Mat();
      this.cv.cvtColor(denoised, result, this.cv.COLOR_GRAY2RGBA);

      // Increase contrast
      result.convertTo(result, -1, 1.2, 0);

      // Apply sharpening
      unsharpMask.sharpen(result, 0.5, 1.5, 0);

      return matToImageData(result);
    } catch (error) {
      console.error('Book filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, denoised, result);
    }
  }

  /**
   * Receipt filter - High contrast for receipts
   */
  private applyReceiptFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let gray: any = null;
    let denoised: any = null;
    let threshold: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);

      // Apply shadow recovery
      shadowHighlightRecovery.recoverShadows(src, 30);

      // Convert to grayscale
      gray = new this.cv.Mat();
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Denoise with bilateral filter
      denoised = new this.cv.Mat();
      this.cv.bilateralFilter(gray, denoised, 5, 40, 40);

      // Otsu's threshold for receipts
      threshold = new this.cv.Mat();
      this.cv.threshold(denoised, threshold, 0, 255, this.cv.THRESH_BINARY + this.cv.THRESH_OTSU);

      // Convert back to RGBA
      result = new this.cv.Mat();
      this.cv.cvtColor(threshold, result, this.cv.COLOR_GRAY2RGBA);

      // Apply sharpening
      unsharpMask.sharpenEdgeAware(result, 0.5);

      return matToImageData(result);
    } catch (error) {
      console.error('Receipt filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, denoised, threshold, result);
    }
  }

  /**
   * Photo filter - Color preservation with enhancement
   */
  private applyPhotoFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);
      result = src.clone();

      // Apply auto white balance
      whiteBalanceCorrector.smartBalance(result);

      // Slight shadow/highlight recovery
      shadowHighlightRecovery.recover(result, 15, 10);

      // Bilateral filter for noise reduction
      // bilateralFilter requires 1 or 3 channels — convert RGBA→RGB→RGBA
      const rgb = new this.cv.Mat();
      const denoised = new this.cv.Mat();
      this.cv.cvtColor(result, rgb, this.cv.COLOR_RGBA2RGB);
      this.cv.bilateralFilter(rgb, denoised, 5, 30, 30);
      rgb.delete();
      this.cv.cvtColor(denoised, result, this.cv.COLOR_RGB2RGBA);
      denoised.delete();

      // Slight enhancement
      result.convertTo(result, -1, 1.1, 5);

      // Apply sharpening
      unsharpMask.sharpen(result, 0.3, 1.5, 0);

      return matToImageData(result);
    } catch (error) {
      console.error('Photo filter failed:', error);
      return null;
    } finally {
      deleteMat(src, result);
    }
  }

  /**
   * Blueprint filter - Inverted colors
   */
  private applyBlueprintFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let gray: any = null;
    let inverted: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);
      gray = new this.cv.Mat();

      // Convert to grayscale
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Invert
      inverted = new this.cv.Mat();
      this.cv.bitwise_not(gray, inverted);

      // Convert back to RGBA with blue tint
      result = new this.cv.Mat();
      this.cv.cvtColor(inverted, result, this.cv.COLOR_GRAY2RGBA);

      // Apply sharpening
      unsharpMask.sharpen(result, 0.4, 1.5, 0);

      return matToImageData(result);
    } catch (error) {
      console.error('Blueprint filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, inverted, result);
    }
  }

  /**
   * Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
   */
  private applyCLAHE(mat: any): void {
    const lab = new this.cv.Mat();
    const channels = new this.cv.MatVector();

    try {
      // Convert to LAB color space
      this.cv.cvtColor(mat, lab, this.cv.COLOR_RGBA2RGB);
      this.cv.cvtColor(lab, lab, this.cv.COLOR_RGB2Lab);

      // Split channels
      this.cv.split(lab, channels);

      // Apply CLAHE to L channel
      const l = channels.get(0);
      const clahe = new this.cv.CLAHE(2.0, new this.cv.Size(8, 8));
      clahe.apply(l, l);
      clahe.delete();

      // Merge back
      this.cv.merge(channels, lab);

      // Convert back to RGB then RGBA
      this.cv.cvtColor(lab, lab, this.cv.COLOR_Lab2RGB);
      this.cv.cvtColor(lab, mat, this.cv.COLOR_RGB2RGBA);
    } finally {
      lab.delete();
      channels.delete();
    }
  }

  /**
   * Apply gamma correction
   */
  private applyGamma(mat: any, gamma: number): void {
    const lookupTable = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lookupTable[i] = Math.pow(i / 255.0, gamma) * 255.0;
    }

    const data = mat.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = lookupTable[data[i]];         // R
      data[i + 1] = lookupTable[data[i + 1]]; // G
      data[i + 2] = lookupTable[data[i + 2]]; // B
      // Alpha channel (i+3) unchanged
    }
  }

  /**
   * Apply saturation adjustment
   */
  private applySaturation(mat: any, saturation: number): void {
    // Convert to HSV
    const hsv = new this.cv.Mat();
    this.cv.cvtColor(mat, hsv, this.cv.COLOR_RGBA2RGB);
    this.cv.cvtColor(hsv, hsv, this.cv.COLOR_RGB2HSV);

    // Split channels
    const channels = new this.cv.MatVector();
    this.cv.split(hsv, channels);

    // Adjust saturation (S channel)
    const s = channels.get(1);
    const factor = 1 + (saturation / 100);
    s.convertTo(s, -1, factor, 0);

    // Merge back
    this.cv.merge(channels, hsv);

    // Convert back to RGBA
    this.cv.cvtColor(hsv, hsv, this.cv.COLOR_HSV2RGB);
    this.cv.cvtColor(hsv, mat, this.cv.COLOR_RGB2RGBA);

    hsv.delete();
    channels.delete();
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && isOpenCVLoaded();
  }
}

// Export singleton instance
export const imageEnhancementService = new ImageEnhancementService();
