import { imageDataToMat, matToImageData, deleteMat, isOpenCVLoaded } from '@/lib/opencv-loader';
import type { EnhancementOptions, FilterPreset } from '@/types';

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

      // Convert to HSV for saturation adjustment
      if (options.saturation !== 0) {
        this.applySaturation(result, options.saturation);
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

      // Convert to grayscale
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Denoise
      denoised = new this.cv.Mat();
      this.cv.fastNlMeansDenoising(gray, denoised, 10, 7, 21);

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

      // Convert back to RGBA
      result = new this.cv.Mat();
      this.cv.cvtColor(threshold, result, this.cv.COLOR_GRAY2RGBA);

      return matToImageData(result);
    } catch (error) {
      console.error('Document filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, denoised, threshold, result);
    }
  }

  /**
   * Magic filter - Auto-enhanced color
   */
  private applyMagicFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let lab: any = null;
    let channels: any = null;
    let l: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);

      // Convert to LAB color space
      lab = new this.cv.Mat();
      this.cv.cvtColor(src, lab, this.cv.COLOR_RGBA2RGB);
      this.cv.cvtColor(lab, lab, this.cv.COLOR_RGB2Lab);

      // Split channels
      channels = new this.cv.MatVector();
      this.cv.split(lab, channels);

      // Apply CLAHE to L channel
      l = channels.get(0);
      const clahe = new this.cv.CLAHE(2.0, new this.cv.Size(8, 8));
      clahe.apply(l, l);

      // Merge back
      this.cv.merge(channels, lab);

      // Convert back to RGB then RGBA
      result = new this.cv.Mat();
      this.cv.cvtColor(lab, result, this.cv.COLOR_Lab2RGB);
      this.cv.cvtColor(result, result, this.cv.COLOR_RGB2RGBA);

      // Slight saturation boost
      result.convertTo(result, -1, 1.1, 0);

      channels.delete();
      clahe.delete();

      return matToImageData(result);
    } catch (error) {
      console.error('Magic filter failed:', error);
      return null;
    } finally {
      deleteMat(src, lab, l, result);
    }
  }

  /**
   * Whiteboard filter - Optimized for whiteboards
   */
  private applyWhiteboardFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let gray: any = null;
    let blurred: any = null;
    let threshold: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);
      gray = new this.cv.Mat();

      // Convert to grayscale
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Blur to reduce noise
      blurred = new this.cv.Mat();
      this.cv.GaussianBlur(gray, blurred, new this.cv.Size(5, 5), 0);

      // Adaptive threshold with larger block size for whiteboards
      threshold = new this.cv.Mat();
      this.cv.adaptiveThreshold(
        blurred,
        threshold,
        255,
        this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        this.cv.THRESH_BINARY,
        15,
        10
      );

      // Convert back to RGBA
      result = new this.cv.Mat();
      this.cv.cvtColor(threshold, result, this.cv.COLOR_GRAY2RGBA);

      // Brighten slightly
      result.convertTo(result, -1, 1.0, 10);

      return matToImageData(result);
    } catch (error) {
      console.error('Whiteboard filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, blurred, threshold, result);
    }
  }

  /**
   * Book filter - Optimized for book pages
   */
  private applyBookFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let gray: any = null;
    let denoised: any = null;
    let sharpened: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);
      gray = new this.cv.Mat();

      // Convert to grayscale
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Denoise
      denoised = new this.cv.Mat();
      this.cv.fastNlMeansDenoising(gray, denoised, 10, 7, 21);

      // Sharpen
      sharpened = new this.cv.Mat();
      const kernel = this.cv.matFromArray(3, 3, this.cv.CV_32F, [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ]);
      this.cv.filter2D(denoised, sharpened, this.cv.CV_8U, kernel);
      kernel.delete();

      // Convert back to RGBA
      result = new this.cv.Mat();
      this.cv.cvtColor(sharpened, result, this.cv.COLOR_GRAY2RGBA);

      // Increase contrast
      result.convertTo(result, -1, 1.2, 0);

      return matToImageData(result);
    } catch (error) {
      console.error('Book filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, denoised, sharpened, result);
    }
  }

  /**
   * Receipt filter - High contrast for receipts
   */
  private applyReceiptFilter(imageData: ImageData): ImageData | null {
    // Similar to document filter but with more aggressive contrast
    let src: any = null;
    let gray: any = null;
    let threshold: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);
      gray = new this.cv.Mat();

      // Convert to grayscale
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Otsu's threshold for receipts
      threshold = new this.cv.Mat();
      this.cv.threshold(gray, threshold, 0, 255, this.cv.THRESH_BINARY + this.cv.THRESH_OTSU);

      // Convert back to RGBA
      result = new this.cv.Mat();
      this.cv.cvtColor(threshold, result, this.cv.COLOR_GRAY2RGBA);

      return matToImageData(result);
    } catch (error) {
      console.error('Receipt filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, threshold, result);
    }
  }

  /**
   * Photo filter - Color preservation
   */
  private applyPhotoFilter(imageData: ImageData): ImageData | null {
    let src: any = null;
    let result: any = null;

    try {
      src = imageDataToMat(imageData);
      result = src.clone();

      // Slight enhancement - brightness and contrast
      result.convertTo(result, -1, 1.1, 5);

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

      return matToImageData(result);
    } catch (error) {
      console.error('Blueprint filter failed:', error);
      return null;
    } finally {
      deleteMat(src, gray, inverted, result);
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
    this.cv.cvtColor(hsv, mat, this.cv.COLOR_HSV2RGB);
    this.cv.cvtColor(mat, mat, this.cv.COLOR_RGB2RGBA);

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
