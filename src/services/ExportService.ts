import { jsPDF } from 'jspdf';
import type {
  Document,
  DocumentPage,
  PDFExportOptions,
  ImageExportOptions,
} from '@/types';

export class ExportService {
  /**
   * Export a document as PDF
   */
  async exportToPDF(
    document: Document,
    options: PDFExportOptions
  ): Promise<Blob> {
    const pageSize = this.getPageSize(options.pageSize);
    const orientation = this.getOrientation(document, options.orientation);

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: options.pageSize === 'original' ? [pageSize.width, pageSize.height] : options.pageSize,
    });

    // Add metadata
    if (options.metadata) {
      if (options.metadata.title) pdf.setProperties({ title: options.metadata.title });
      if (options.metadata.author) pdf.setProperties({ author: options.metadata.author });
      if (options.metadata.subject) pdf.setProperties({ subject: options.metadata.subject });
    }

    // Add pages
    for (let i = 0; i < document.pages.length; i++) {
      const page = document.pages[i];

      if (i > 0) {
        pdf.addPage();
      }

      // Convert page image to data URL
      const imageData = await this.blobToDataURL(page.processedImage);

      // Calculate dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (options.pageSize === 'original') {
        // Use original image dimensions
        const imgWidth = page.dimensions.width;
        const imgHeight = page.dimensions.height;
        const aspectRatio = imgWidth / imgHeight;

        let width = pdfWidth;
        let height = pdfWidth / aspectRatio;

        if (height > pdfHeight) {
          height = pdfHeight;
          width = pdfHeight * aspectRatio;
        }

        const x = (pdfWidth - width) / 2;
        const y = (pdfHeight - height) / 2;

        pdf.addImage(imageData, 'JPEG', x, y, width, height);
      } else {
        // Fit to page size
        pdf.addImage(imageData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      // Add OCR text layer if requested and available
      if (options.includeOCR && page.ocrResult) {
        this.addTextLayer(pdf, page, pdfWidth, pdfHeight);
      }
    }

    // Get PDF as blob
    return pdf.output('blob');
  }

  /**
   * Export a single page as image
   */
  async exportToImage(
    page: DocumentPage,
    options: ImageExportOptions
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Load image from blob
    const imageData = await this.blobToImageData(page.processedImage);

    let width = imageData.width;
    let height = imageData.height;

    // Scale if maxDimension specified
    if (options.maxDimension) {
      const maxDim = Math.max(width, height);
      if (maxDim > options.maxDimension) {
        const scale = options.maxDimension / maxDim;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
    }

    canvas.width = width;
    canvas.height = height;

    // Draw scaled image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Failed to get temp canvas context');

    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, width, height);

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        options.format === 'png' ? 'image/png' : 'image/jpeg',
        options.format === 'jpeg' ? options.quality / 100 : undefined
      );
    });
  }

  /**
   * Export multiple pages as images (ZIP would be ideal but keeping it simple)
   */
  async exportMultipleImages(
    document: Document,
    options: ImageExportOptions
  ): Promise<Blob[]> {
    const blobs: Blob[] = [];

    for (const page of document.pages) {
      const blob = await this.exportToImage(page, options);
      blobs.push(blob);
    }

    return blobs;
  }

  /**
   * Export OCR text as plain text
   */
  async exportToText(document: Document): Promise<Blob> {
    const texts: string[] = [];

    for (const page of document.pages) {
      if (page.ocrResult) {
        texts.push(`--- Page ${page.pageNumber} ---\n\n${page.ocrResult.text}\n\n`);
      }
    }

    if (texts.length === 0) {
      throw new Error('No OCR text available in this document');
    }

    const content = texts.join('\n');
    return new Blob([content], { type: 'text/plain' });
  }

  /**
   * Download a blob with a given filename
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Share using Web Share API
   */
  async share(blob: Blob, filename: string, title: string): Promise<void> {
    if (!navigator.share || !navigator.canShare) {
      throw new Error('Web Share API not supported');
    }

    const file = new File([blob], filename, { type: blob.type });

    if (!navigator.canShare({ files: [file] })) {
      throw new Error('Cannot share this file type');
    }

    await navigator.share({
      title,
      files: [file],
    });
  }

  /**
   * Helper: Convert blob to data URL
   */
  private async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Helper: Convert blob to ImageData
   */
  private async blobToImageData(blob: Blob): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Helper: Get page size in mm
   */
  private getPageSize(size: PDFExportOptions['pageSize']): { width: number; height: number } {
    switch (size) {
      case 'a4':
        return { width: 210, height: 297 };
      case 'letter':
        return { width: 216, height: 279 };
      case 'legal':
        return { width: 216, height: 356 };
      default:
        return { width: 210, height: 297 }; // Default to A4
    }
  }

  /**
   * Helper: Determine orientation
   */
  private getOrientation(
    document: Document,
    orientation: PDFExportOptions['orientation']
  ): 'portrait' | 'landscape' {
    if (orientation !== 'auto') return orientation;

    // Auto-detect from first page
    const firstPage = document.pages[0];
    if (firstPage) {
      return firstPage.dimensions.width > firstPage.dimensions.height
        ? 'landscape'
        : 'portrait';
    }

    return 'portrait';
  }

  /**
   * Helper: Add invisible text layer for searchable PDF
   */
  private addTextLayer(
    pdf: jsPDF,
    page: DocumentPage,
    pdfWidth: number,
    pdfHeight: number
  ): void {
    if (!page.ocrResult) return;

    const scaleX = pdfWidth / page.dimensions.width;
    const scaleY = pdfHeight / page.dimensions.height;

    pdf.setTextColor(255, 255, 255); // White text (invisible)
    pdf.setFontSize(8);

    for (const word of page.ocrResult.words) {
      const x = word.boundingBox.x * scaleX;
      const y = word.boundingBox.y * scaleY;

      pdf.text(word.text, x, y, {
        renderingMode: 'invisible',
      });
    }
  }
}

// Singleton instance
let exportServiceInstance: ExportService | null = null;

export function getExportService(): ExportService {
  if (!exportServiceInstance) {
    exportServiceInstance = new ExportService();
  }
  return exportServiceInstance;
}
