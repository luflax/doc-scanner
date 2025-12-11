import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { getStorageService } from '@/services/StorageService';
import { getBulkExportService } from '@/services/BulkExportService';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { StorageInfo } from '@/components/common/StorageInfo';
import type { Document, PDFExportOptions, ImageExportOptions } from '@/types';
import type { BulkExportFormat } from '@/services/BulkExportService';

export const DocumentsView: React.FC = () => {
  const {
    documents,
    selectedDocumentIds,
    setDocuments,
    setCurrentDocument,
    removeDocument,
    toggleDocumentSelection,
    clearDocumentSelection,
    selectAllDocuments,
    setCurrentView,
    addToast,
  } = useStore((state) => ({
    documents: state.documents.list,
    selectedDocumentIds: state.documents.selectedDocumentIds,
    setDocuments: state.setDocuments,
    setCurrentDocument: state.setCurrentDocument,
    removeDocument: state.removeDocument,
    toggleDocumentSelection: state.toggleDocumentSelection,
    clearDocumentSelection: state.clearDocumentSelection,
    selectAllDocuments: state.selectAllDocuments,
    setCurrentView: state.setCurrentView,
    addToast: state.addToast,
  }));

  const [isLoading, setIsLoading] = useState(true);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);

  // Load documents from storage on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Load thumbnails for documents
  useEffect(() => {
    if (documents.length > 0) {
      loadThumbnails();
    }
  }, [documents]);

  // Filter documents based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = documents.filter((doc) => {
        // Search in document name
        if (doc.name.toLowerCase().includes(query)) {
          return true;
        }
        // Search in tags
        if (doc.tags.some((tag) => tag.toLowerCase().includes(query))) {
          return true;
        }
        // Search in OCR text
        if (doc.metadata.hasOCR) {
          for (const page of doc.pages) {
            if (page.ocrResult && page.ocrResult.text.toLowerCase().includes(query)) {
              return true;
            }
          }
        }
        return false;
      });
      setFilteredDocuments(filtered);
    }
  }, [documents, searchQuery]);

  const loadDocuments = async () => {
    try {
      const storageService = await getStorageService();
      const docs = await storageService.listDocuments({ sortBy: 'updatedAt', sortOrder: 'desc' });
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      addToast({
        type: 'error',
        message: 'Failed to load documents',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadThumbnails = async () => {
    const newThumbnails = new Map<string, string>();

    for (const doc of documents) {
      if (doc.pages.length > 0) {
        const firstPage = doc.pages[0];
        const url = URL.createObjectURL(firstPage.thumbnailImage);
        newThumbnails.set(doc.id, url);
      }
    }

    setThumbnails(newThumbnails);

    // Cleanup old URLs
    return () => {
      thumbnails.forEach((url) => URL.revokeObjectURL(url));
    };
  };

  const handleDocumentClick = (document: Document) => {
    if (isSelectionMode) {
      toggleDocumentSelection(document.id);
    } else {
      setCurrentDocument(document);
      setCurrentView('detail'); // Go to detail view
    }
  };

  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      clearDocumentSelection();
    }
    setIsSelectionMode(!isSelectionMode);
  };

  const handleSelectAll = () => {
    if (selectedDocumentIds.length === documents.length) {
      clearDocumentSelection();
    } else {
      selectAllDocuments();
    }
  };

  const handleBulkExport = async (format: BulkExportFormat) => {
    if (selectedDocumentIds.length === 0) {
      addToast({
        type: 'error',
        message: 'No documents selected',
      });
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress({ current: 0, total: selectedDocumentIds.length });

      const bulkExportService = getBulkExportService();
      const selectedDocs = documents.filter((doc) =>
        selectedDocumentIds.includes(doc.id)
      );

      const pdfOptions: PDFExportOptions = {
        pageSize: 'a4',
        orientation: 'auto',
        quality: 'high',
        includeOCR: false,
        compression: true,
      };

      const imageOptions: ImageExportOptions = {
        format: 'png',
        quality: 90,
      };

      const zipBlob = await bulkExportService.exportDocumentsAsZip(
        selectedDocs,
        {
          format,
          pdfOptions,
          imageOptions,
        },
        (progress) => {
          setExportProgress({ current: progress.current, total: progress.total });
        }
      );

      // Download the zip file
      const filename = bulkExportService.generateZipFilename(
        selectedDocumentIds.length,
        format
      );
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        message: `Successfully exported ${selectedDocumentIds.length} document${selectedDocumentIds.length !== 1 ? 's' : ''}`,
      });

      // Exit selection mode after export
      setIsSelectionMode(false);
      clearDocumentSelection();
    } catch (error) {
      console.error('Bulk export failed:', error);
      addToast({
        type: 'error',
        message: 'Failed to export documents',
      });
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const storageService = await getStorageService();
      await storageService.deleteDocument(docId);
      removeDocument(docId);

      addToast({
        type: 'success',
        message: 'Document deleted',
      });
    } catch (error) {
      console.error('Failed to delete document:', error);
      addToast({
        type: 'error',
        message: 'Failed to delete document',
      });
    }
  };

  const handleOCRDocument = async (e: React.MouseEvent, document: Document) => {
    e.stopPropagation();
    setCurrentDocument(document);
    setCurrentView('ocr');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600 mt-4">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
        <div className="text-6xl mb-4">📁</div>
        <h2 className="text-xl font-semibold mb-2">No Documents Yet</h2>
        <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
          Start by scanning your first document using the camera.
        </p>
        <Button onClick={() => setCurrentView('camera')} variant="primary" size="lg">
          Scan Document
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Documents</h2>
          <div className="flex gap-2">
            <Button
              onClick={handleToggleSelectionMode}
              variant={isSelectionMode ? 'secondary' : 'outline'}
              size="sm"
            >
              {isSelectionMode ? 'Cancel' : 'Select'}
            </Button>
            {!isSelectionMode && (
              <Button
                onClick={() => setCurrentView('camera')}
                variant="primary"
                size="sm"
              >
                + New Scan
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {!isSelectionMode && documents.length > 0 && (
          <div className="mt-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents, tags, or text..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-gray-600">
            {isSelectionMode && selectedDocumentIds.length > 0
              ? `${selectedDocumentIds.length} selected`
              : searchQuery
              ? `${filteredDocuments.length} of ${documents.length} document${documents.length !== 1 ? 's' : ''}`
              : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
          </p>
          {isSelectionMode && (
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {selectedDocumentIds.length === documents.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {/* Storage Info */}
        {!isSelectionMode && (
          <div className="mt-3">
            <StorageInfo compact />
          </div>
        )}
      </div>

      {/* Documents Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => {
            const isSelected = selectedDocumentIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                className={`bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer overflow-hidden ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-gray-200 relative overflow-hidden">
                  {thumbnails.has(doc.id) ? (
                    <img
                      src={thumbnails.get(doc.id)}
                      alt={doc.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">📄</span>
                    </div>
                  )}

                  {/* Selection checkbox */}
                  {isSelectionMode && (
                    <div className="absolute top-2 left-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Delete button overlay */}
                  {!isSelectionMode && (
                    <button
                      onClick={(e) => handleDeleteDocument(e, doc.id)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                      title="Delete document"
                    >
                      ×
                    </button>
                  )}
                </div>

              {/* Document Info */}
              <div className="p-3">
                <h3 className="text-sm font-medium truncate mb-1">{doc.name}</h3>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{doc.pages.length} page{doc.pages.length !== 1 ? 's' : ''}</span>
                  <span>{doc.metadata.hasOCR ? '✓ OCR' : ''}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </div>

                {/* Quick Actions */}
                {!isSelectionMode && (
                  <div className="flex gap-2 mt-2">
                    {!doc.metadata.hasOCR && (
                      <button
                        onClick={(e) => handleOCRDocument(e, doc)}
                        className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      >
                        Extract Text
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentDocument(doc);
                        setCurrentView('export');
                      }}
                      className="flex-1 px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                    >
                      Export
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Bulk Export Action Bar */}
      {isSelectionMode && selectedDocumentIds.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
          {isExporting ? (
            <div className="text-center">
              <Spinner size="sm" />
              <p className="text-sm text-gray-600 mt-2">
                Exporting {exportProgress.current} of {exportProgress.total}...
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => handleBulkExport('pdf')}
                variant="primary"
                size="md"
                className="flex-1"
              >
                📄 Export as PDFs
              </Button>
              <Button
                onClick={() => handleBulkExport('images')}
                variant="secondary"
                size="md"
                className="flex-1"
              >
                🖼️ Export as Images
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
