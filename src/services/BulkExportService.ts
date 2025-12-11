import JSZip from 'jszip';
import type {
  Document,
  PDFExportOptions,
  ImageExportOptions,
} from '@/types';
import { getExportService } from './ExportService';

export type BulkExportFormat = 'pdf' | 'images';

export interface BulkExportOptions {
  format: BulkExportFormat;
  pdfOptions?: PDFExportOptions;
  imageOptions?: ImageExportOptions;
}

export interface BulkExportProgress {
  current: number;
  total: number;
  currentDocumentName: string;
}

export class BulkExportService {
  private exportService = getExportService();

  /**
   * Export multiple documents as a zip file
   */
  async exportDocumentsAsZip(
    documents: Document[],
    options: BulkExportOptions,
    onProgress?: (progress: BulkExportProgress) => void
  ): Promise<Blob> {
    if (documents.length === 0) {
      throw new Error('No documents selected for export');
    }

    const zip = new JSZip();

    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];

      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: documents.length,
          currentDocumentName: document.name,
        });
      }

      const sanitizedName = this.sanitizeFilename(document.name);

      if (options.format === 'pdf') {
        // Export as PDF
        const pdfBlob = await this.exportService.exportToPDF(
          document,
          options.pdfOptions || this.getDefaultPDFOptions()
        );
        zip.file(`${sanitizedName}.pdf`, pdfBlob);
      } else {
        // Export as images
        const imageBlobs = await this.exportService.exportMultipleImages(
          document,
          options.imageOptions || this.getDefaultImageOptions()
        );

        // Create a folder for each document if it has multiple pages
        if (imageBlobs.length > 1) {
          const folder = zip.folder(sanitizedName);
          if (folder) {
            imageBlobs.forEach((blob, index) => {
              const extension = options.imageOptions?.format === 'jpeg' ? 'jpg' : 'png';
              folder.file(`page_${index + 1}.${extension}`, blob);
            });
          }
        } else if (imageBlobs.length === 1) {
          // Single page, add directly
          const extension = options.imageOptions?.format === 'jpeg' ? 'jpg' : 'png';
          zip.file(`${sanitizedName}.${extension}`, imageBlobs[0]);
        }
      }
    }

    // Generate zip file
    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    });
  }

  /**
   * Export selected documents (convenience method)
   */
  async exportSelectedDocuments(
    documentIds: string[],
    allDocuments: Document[],
    options: BulkExportOptions,
    onProgress?: (progress: BulkExportProgress) => void
  ): Promise<Blob> {
    const selectedDocs = allDocuments.filter((doc) =>
      documentIds.includes(doc.id)
    );
    return this.exportDocumentsAsZip(selectedDocs, options, onProgress);
  }

  /**
   * Get default PDF export options
   */
  private getDefaultPDFOptions(): PDFExportOptions {
    return {
      pageSize: 'a4',
      orientation: 'auto',
      quality: 'high',
      includeOCR: false,
      compression: true,
    };
  }

  /**
   * Get default image export options
   */
  private getDefaultImageOptions(): ImageExportOptions {
    return {
      format: 'png',
      quality: 90,
    };
  }

  /**
   * Sanitize filename to be safe for file systems
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9_\-\s]/gi, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100); // Limit length
  }

  /**
   * Generate a default zip filename
   */
  generateZipFilename(documentCount: number, format: BulkExportFormat): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const formatLabel = format === 'pdf' ? 'PDFs' : 'Images';
    return `documents_${documentCount}_${formatLabel}_${timestamp}.zip`;
  }
}

// Singleton instance
let bulkExportServiceInstance: BulkExportService | null = null;

export function getBulkExportService(): BulkExportService {
  if (!bulkExportServiceInstance) {
    bulkExportServiceInstance = new BulkExportService();
  }
  return bulkExportServiceInstance;
}
