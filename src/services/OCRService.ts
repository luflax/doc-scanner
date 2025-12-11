import Tesseract, { createWorker, type Worker } from 'tesseract.js';
import type {
  OCRConfig,
  OCRResult,
  OCRProgress,
  OrientationResult,
} from '@/types';

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentLanguages: string[] = ['eng'];

  /**
   * Initialize the OCR worker with specified languages
   */
  async initialize(
    languages: string[] = ['eng'],
    onProgress?: (progress: OCRProgress) => void
  ): Promise<void> {
    if (this.isInitialized && this.arraysEqual(languages, this.currentLanguages)) {
      return;
    }

    // Terminate existing worker if languages changed
    if (this.worker) {
      await this.terminate();
    }

    try {
      this.worker = await createWorker(languages.join('+'), 1, {
        logger: (m) => {
          if (onProgress) {
            onProgress({
              status: m.status,
              progress: m.progress || 0,
            });
          }
        },
      });

      this.currentLanguages = languages;
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      throw new Error('Failed to initialize OCR service');
    }
  }

  /**
   * Perform OCR on an image
   */
  async recognize(
    image: ImageData | HTMLImageElement | HTMLCanvasElement,
    config?: Partial<OCRConfig>
  ): Promise<OCRResult> {
    if (!this.worker || !this.isInitialized) {
      throw new Error('OCR service not initialized');
    }

    const startTime = performance.now();

    try {
      // Configure the worker if options provided
      if (config) {
        if (config.pageSegMode !== undefined) {
          await this.worker.setParameters({
            tessedit_pageseg_mode: config.pageSegMode as any,
          });
        }

        if (config.preserveInterwordSpaces !== undefined) {
          await this.worker.setParameters({
            preserve_interword_spaces: config.preserveInterwordSpaces ? '1' : '0',
          });
        }

        if (config.characterWhitelist) {
          await this.worker.setParameters({
            tessedit_char_whitelist: config.characterWhitelist,
          });
        }

        if (config.characterBlacklist) {
          await this.worker.setParameters({
            tessedit_char_blacklist: config.characterBlacklist,
          });
        }
      }

      // Perform recognition
      const result = await this.worker.recognize(image);
      const processingTime = performance.now() - startTime;

      return this.formatResult(result.data, processingTime);
    } catch (error) {
      console.error('OCR recognition failed:', error);
      throw new Error('Failed to perform OCR');
    }
  }

  /**
   * Detect text orientation
   */
  async detectOrientation(
    image: ImageData | HTMLImageElement | HTMLCanvasElement
  ): Promise<OrientationResult> {
    if (!this.worker || !this.isInitialized) {
      throw new Error('OCR service not initialized');
    }

    try {
      const result = await this.worker.detect(image);
      return {
        degrees: result.data.orientation_degrees || 0,
        confidence: result.data.orientation_confidence || 0,
        script: result.data.script || 'Latin',
      };
    } catch (error) {
      console.error('Orientation detection failed:', error);
      throw new Error('Failed to detect orientation');
    }
  }

  /**
   * Preprocess image for better OCR results
   */
  preprocessForOCR(imageData: ImageData): ImageData {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    const data = imageData.data;

    // Convert to grayscale and apply adaptive threshold
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    return imageData;
  }

  /**
   * Terminate the worker and clean up resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Format Tesseract result to match our OCRResult type
   */
  private formatResult(data: Tesseract.Page, processingTime: number): OCRResult {
    return {
      text: data.text,
      confidence: data.confidence,
      words: data.words.map((word) => ({
        text: word.text,
        confidence: word.confidence,
        boundingBox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
        },
        baseline: {
          x0: word.baseline.x0,
          y0: word.baseline.y0,
          x1: word.baseline.x1,
          y1: word.baseline.y1,
        },
      })),
      lines: data.lines.map((line) => ({
        text: line.text,
        confidence: line.confidence,
        boundingBox: {
          x: line.bbox.x0,
          y: line.bbox.y0,
          width: line.bbox.x1 - line.bbox.x0,
          height: line.bbox.y1 - line.bbox.y0,
        },
        words: line.words.map((word) => ({
          text: word.text,
          confidence: word.confidence,
          boundingBox: {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
          },
          baseline: {
            x0: word.baseline.x0,
            y0: word.baseline.y0,
            x1: word.baseline.x1,
            y1: word.baseline.y1,
          },
        })),
      })),
      paragraphs: data.paragraphs.map((para) => ({
        text: para.text,
        confidence: para.confidence,
        boundingBox: {
          x: para.bbox.x0,
          y: para.bbox.y0,
          width: para.bbox.x1 - para.bbox.x0,
          height: para.bbox.y1 - para.bbox.y0,
        },
        lines: para.lines.map((line) => ({
          text: line.text,
          confidence: line.confidence,
          boundingBox: {
            x: line.bbox.x0,
            y: line.bbox.y0,
            width: line.bbox.x1 - line.bbox.x0,
            height: line.bbox.y1 - line.bbox.y0,
          },
          words: line.words.map((word) => ({
            text: word.text,
            confidence: word.confidence,
            boundingBox: {
              x: word.bbox.x0,
              y: word.bbox.y0,
              width: word.bbox.x1 - word.bbox.x0,
              height: word.bbox.y1 - word.bbox.y0,
            },
            baseline: {
              x0: word.baseline.x0,
              y0: word.baseline.y0,
              x1: word.baseline.x1,
              y1: word.baseline.y1,
            },
          })),
        })),
      })),
      blocks: (data.blocks || []).map((block) => ({
        text: block.text,
        confidence: block.confidence,
        boundingBox: {
          x: block.bbox.x0,
          y: block.bbox.y0,
          width: block.bbox.x1 - block.bbox.x0,
          height: block.bbox.y1 - block.bbox.y0,
        },
        paragraphs: block.paragraphs.map((para) => ({
          text: para.text,
          confidence: para.confidence,
          boundingBox: {
            x: para.bbox.x0,
            y: para.bbox.y0,
            width: para.bbox.x1 - para.bbox.x0,
            height: para.bbox.y1 - para.bbox.y0,
          },
          lines: para.lines.map((line) => ({
            text: line.text,
            confidence: line.confidence,
            boundingBox: {
              x: line.bbox.x0,
              y: line.bbox.y0,
              width: line.bbox.x1 - line.bbox.x0,
              height: line.bbox.y1 - line.bbox.y0,
            },
            words: line.words.map((word) => ({
              text: word.text,
              confidence: word.confidence,
              boundingBox: {
                x: word.bbox.x0,
                y: word.bbox.y0,
                width: word.bbox.x1 - word.bbox.x0,
                height: word.bbox.y1 - word.bbox.y0,
              },
              baseline: {
                x0: word.baseline.x0,
                y0: word.baseline.y0,
                x1: word.baseline.x1,
                y1: word.baseline.y1,
              },
            })),
          })),
        })),
      })),
      processingTime,
    };
  }

  /**
   * Helper to compare arrays
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }
}

// Singleton instance
let ocrServiceInstance: OCRService | null = null;

export function getOCRService(): OCRService {
  if (!ocrServiceInstance) {
    ocrServiceInstance = new OCRService();
  }
  return ocrServiceInstance;
}
