import React, { useState } from 'react';
import { useStore } from '@/store';
import { getExportService } from '@/services/ExportService';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import type { PDFExportOptions, ImageExportOptions, ExportFormat } from '@/types';

export const ExportView: React.FC = () => {
  const { currentDocument, setCurrentView, addToast } = useStore((state) => ({
    currentDocument: state.documents.currentDocument,
    setCurrentView: state.setCurrentView,
    addToast: state.addToast,
  }));

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // PDF options
  const [pdfOptions, setPdfOptions] = useState<PDFExportOptions>({
    pageSize: 'a4',
    orientation: 'auto',
    quality: 'high',
    includeOCR: false,
    compression: true,
  });

  // Image options
  const [imageOptions, setImageOptions] = useState<ImageExportOptions>({
    format: 'png',
    quality: 90,
  });

  const exportService = getExportService();

  const handleExport = async () => {
    if (!currentDocument) {
      addToast({
        type: 'error',
        message: 'No document to export',
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      let filename = `${currentDocument.name}`;

      switch (selectedFormat) {
        case 'pdf': {
          setExportProgress(30);
          const blob = await exportService.exportToPDF(currentDocument, pdfOptions);
          setExportProgress(100);
          filename += '.pdf';
          exportService.downloadBlob(blob, filename);
          addToast({
            type: 'success',
            message: 'PDF exported successfully',
          });
          break;
        }

        case 'png':
        case 'jpeg': {
          if (currentDocument.pages.length === 1) {
            setExportProgress(50);
            const blob = await exportService.exportToImage(
              currentDocument.pages[0],
              { ...imageOptions, format: selectedFormat }
            );
            setExportProgress(100);
            filename += `.${selectedFormat}`;
            exportService.downloadBlob(blob, filename);
            addToast({
              type: 'success',
              message: `${selectedFormat.toUpperCase()} exported successfully`,
            });
          } else {
            // Multiple pages - export as separate files
            const blobs = await exportService.exportMultipleImages(
              currentDocument,
              { ...imageOptions, format: selectedFormat }
            );

            for (let i = 0; i < blobs.length; i++) {
              setExportProgress(((i + 1) / blobs.length) * 100);
              const pageFilename = `${currentDocument.name}_page${i + 1}.${selectedFormat}`;
              exportService.downloadBlob(blobs[i], pageFilename);
            }

            addToast({
              type: 'success',
              message: `${blobs.length} images exported successfully`,
            });
          }
          break;
        }

        case 'txt': {
          setExportProgress(50);
          const blob = await exportService.exportToText(currentDocument);
          setExportProgress(100);
          filename += '.txt';
          exportService.downloadBlob(blob, filename);
          addToast({
            type: 'success',
            message: 'Text exported successfully',
          });
          break;
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Export failed',
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleShare = async () => {
    if (!currentDocument) return;

    setIsExporting(true);

    try {
      let blob: Blob;
      let filename: string;

      switch (selectedFormat) {
        case 'pdf':
          blob = await exportService.exportToPDF(currentDocument, pdfOptions);
          filename = `${currentDocument.name}.pdf`;
          break;
        case 'png':
        case 'jpeg':
          if (currentDocument.pages.length === 1) {
            blob = await exportService.exportToImage(
              currentDocument.pages[0],
              { ...imageOptions, format: selectedFormat }
            );
            filename = `${currentDocument.name}.${selectedFormat}`;
          } else {
            addToast({
              type: 'warning',
              message: 'Can only share single-page documents. Export multiple pages separately.',
            });
            return;
          }
          break;
        case 'txt':
          blob = await exportService.exportToText(currentDocument);
          filename = `${currentDocument.name}.txt`;
          break;
        default:
          throw new Error('Invalid format');
      }

      await exportService.share(blob, filename, currentDocument.name);
      addToast({
        type: 'success',
        message: 'Shared successfully',
      });
    } catch (error) {
      console.error('Share failed:', error);
      if (error instanceof Error && error.message.includes('not supported')) {
        // Fallback to download
        handleExport();
      } else {
        addToast({
          type: 'error',
          message: 'Share failed',
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
        <div className="text-6xl mb-4">📤</div>
        <h2 className="text-xl font-semibold mb-2">No Document Selected</h2>
        <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
          Select a document from your library to export it.
        </p>
        <Button onClick={() => setCurrentView('documents')} variant="primary" size="lg">
          Go to Documents
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        {/* Document Info */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{currentDocument.name}</h2>
          <p className="text-sm text-gray-600">
            {currentDocument.pages.length} page{currentDocument.pages.length !== 1 ? 's' : ''}
            {currentDocument.metadata.hasOCR && ' • OCR processed'}
          </p>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedFormat('pdf')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedFormat === 'pdf'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">📄</div>
              <div className="font-medium">PDF</div>
              <div className="text-xs text-gray-600">Multi-page document</div>
            </button>

            <button
              onClick={() => setSelectedFormat('png')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedFormat === 'png'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">🖼️</div>
              <div className="font-medium">PNG</div>
              <div className="text-xs text-gray-600">Lossless image</div>
            </button>

            <button
              onClick={() => setSelectedFormat('jpeg')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedFormat === 'jpeg'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">📷</div>
              <div className="font-medium">JPEG</div>
              <div className="text-xs text-gray-600">Compressed image</div>
            </button>

            <button
              onClick={() => setSelectedFormat('txt')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedFormat === 'txt'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              disabled={!currentDocument.metadata.hasOCR}
            >
              <div className="text-3xl mb-2">📝</div>
              <div className="font-medium">Text</div>
              <div className="text-xs text-gray-600">
                {currentDocument.metadata.hasOCR ? 'OCR text only' : 'OCR required'}
              </div>
            </button>
          </div>
        </div>

        {/* PDF Options */}
        {selectedFormat === 'pdf' && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-3">PDF Options</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Page Size</label>
                <select
                  value={pdfOptions.pageSize}
                  onChange={(e) =>
                    setPdfOptions({ ...pdfOptions, pageSize: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                  <option value="legal">Legal</option>
                  <option value="original">Original Size</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Orientation</label>
                <select
                  value={pdfOptions.orientation}
                  onChange={(e) =>
                    setPdfOptions({ ...pdfOptions, orientation: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="auto">Auto</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Quality</label>
                <select
                  value={pdfOptions.quality}
                  onChange={(e) =>
                    setPdfOptions({ ...pdfOptions, quality: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="low">Low (smaller file)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="original">Original</option>
                </select>
              </div>

              {currentDocument.metadata.hasOCR && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pdfOptions.includeOCR}
                    onChange={(e) =>
                      setPdfOptions({ ...pdfOptions, includeOCR: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    Include OCR text layer (searchable PDF)
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Image Options */}
        {(selectedFormat === 'png' || selectedFormat === 'jpeg') && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-3">Image Options</h3>

            <div className="space-y-4">
              {selectedFormat === 'jpeg' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Quality: {imageOptions.quality}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={imageOptions.quality}
                    onChange={(e) =>
                      setImageOptions({ ...imageOptions, quality: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={imageOptions.maxDimension !== undefined}
                    onChange={(e) =>
                      setImageOptions({
                        ...imageOptions,
                        maxDimension: e.target.checked ? 2048 : undefined,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Limit maximum dimension</span>
                </label>
                {imageOptions.maxDimension !== undefined && (
                  <input
                    type="number"
                    value={imageOptions.maxDimension}
                    onChange={(e) =>
                      setImageOptions({
                        ...imageOptions,
                        maxDimension: parseInt(e.target.value),
                      })
                    }
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Max dimension (px)"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        {isExporting && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Exporting...</span>
              <span className="text-sm text-gray-600">{Math.round(exportProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="primary"
            size="lg"
            className="flex-1"
          >
            {isExporting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                Exporting...
              </span>
            ) : (
              `Export as ${selectedFormat.toUpperCase()}`
            )}
          </Button>

          {typeof navigator.share !== 'undefined' && (
            <Button
              onClick={handleShare}
              disabled={isExporting}
              variant="secondary"
              size="lg"
            >
              📤 Share
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
