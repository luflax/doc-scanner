import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { getStorageService } from '@/services/StorageService';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import type { Document } from '@/types';

export const DocumentsView: React.FC = () => {
  const {
    documents,
    setDocuments,
    setCurrentDocument,
    removeDocument,
    setCurrentView,
    addToast,
  } = useStore((state) => ({
    documents: state.documents.list,
    setDocuments: state.setDocuments,
    setCurrentDocument: state.setCurrentDocument,
    removeDocument: state.removeDocument,
    setCurrentView: state.setCurrentView,
    addToast: state.addToast,
  }));

  const [isLoading, setIsLoading] = useState(true);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());

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
    setCurrentDocument(document);
    setCurrentView('export'); // Go to export view for now
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
          <Button
            onClick={() => setCurrentView('camera')}
            variant="primary"
            size="sm"
          >
            + New Scan
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Documents Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => handleDocumentClick(doc)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
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

                {/* Delete button overlay */}
                <button
                  onClick={(e) => handleDeleteDocument(e, doc.id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                  title="Delete document"
                >
                  ×
                </button>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
