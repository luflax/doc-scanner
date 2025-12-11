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
  const [useFormattedText, setUseFormattedText] = useState(false);

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
          const blob = await exportService.exportToText(currentDocument, useFormattedText);
          setExportProgress(100);
          filename += useFormattedText ? '.md' : '.txt';
          exportService.downloadBlob(blob, filename);
          addToast({
            type: 'success',
            message: useFormattedText ? 'Markdown exported successfully' : 'Text exported successfully',
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
          blob = await exportService.exportToText(currentDocument, useFormattedText);
          filename = `${currentDocument.name}.${useFormattedText ? 'md' : 'txt'}`;
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

        {/* Export Presets */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quick Presets
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setSelectedFormat('pdf');
                setPdfOptions({
                  ...pdfOptions,
                  pageSize: 'a4',
                  quality: 'high',
                  includeOCR: currentDocument?.metadata.hasOCR || false,
                });
              }}
              className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              📧 Email
              <div className="text-xs text-gray-500 mt-1">PDF • High quality</div>
            </button>

            <button
              onClick={() => {
                setSelectedFormat('pdf');
                setPdfOptions({
                  ...pdfOptions,
                  pageSize: 'a4',
                  quality: 'medium',
                  includeOCR: false,
                });
              }}
              className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              🖨️ Print
              <div className="text-xs text-gray-500 mt-1">PDF • A4 • Medium</div>
            </button>

            <button
              onClick={() => {
                setSelectedFormat('pdf');
                setPdfOptions({
                  ...pdfOptions,
                  pageSize: 'original',
                  quality: 'original',
                  includeOCR: currentDocument?.metadata.hasOCR || false,
                });
              }}
              className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              💾 Archive
              <div className="text-xs text-gray-500 mt-1">PDF • Original</div>
            </button>

            <button
              onClick={() => {
                setSelectedFormat('jpeg');
                setImageOptions({
                  format: 'jpeg',
                  quality: 80,
                  maxDimension: 1920,
                });
              }}
              className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              📱 Mobile
              <div className="text-xs text-gray-500 mt-1">JPEG • Optimized</div>
            </button>

            <button
              onClick={() => {
                setSelectedFormat('png');
                setImageOptions({
                  format: 'png',
                  quality: 100,
                });
              }}
              className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              🎨 Design
              <div className="text-xs text-gray-500 mt-1">PNG • Lossless</div>
            </button>

            {currentDocument?.metadata.hasOCR && (
              <button
                onClick={() => {
                  setSelectedFormat('txt');
                  setUseFormattedText(true);
                }}
                className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                📝 Notes
                <div className="text-xs text-gray-500 mt-1">Markdown • Text</div>
              </button>
            )}
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

        {/* Text Options */}
        {selectedFormat === 'txt' && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-3">Text Options</h3>

            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useFormattedText}
                  onChange={(e) => setUseFormattedText(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Export as Markdown (formatted with headings and metadata)
                </span>
              </label>

              <div className="text-xs text-gray-600 bg-white p-3 rounded border border-gray-200">
                {useFormattedText ? (
                  <>
                    <strong>Markdown format:</strong> Includes document title, creation date,
                    page headings, and confidence scores. Perfect for documentation or note-taking apps.
                  </>
                ) : (
                  <>
                    <strong>Plain text format:</strong> Simple text output with page separators.
                    Compatible with any text editor.
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Preview */}
        {!isExporting && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-3">Document Preview</h3>
            <div className="grid grid-cols-3 gap-2">
              {currentDocument.pages.slice(0, 6).map((page) => (
                <div key={page.id} className="aspect-[3/4] bg-gray-200 rounded overflow-hidden relative">
                  <img
                    src={URL.createObjectURL(page.thumbnailImage)}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                    {page.pageNumber}
                  </div>
                </div>
              ))}
              {currentDocument.pages.length > 6 && (
                <div className="aspect-[3/4] bg-gray-300 rounded flex items-center justify-center text-gray-600 text-sm">
                  +{currentDocument.pages.length - 6} more
                </div>
              )}
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
