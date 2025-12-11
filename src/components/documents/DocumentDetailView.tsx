import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store';
import { getStorageService } from '@/services/StorageService';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import { Spinner } from '@/components/common/Spinner';
import type { Document, DocumentPage } from '@/types';

export const DocumentDetailView: React.FC = () => {
  const {
    currentDocument,
    setCurrentDocument,
    setDocuments,
    setCurrentView,
    addToast,
  } = useStore((state) => ({
    currentDocument: state.documents.currentDocument,
    setCurrentDocument: state.setCurrentDocument,
    setDocuments: state.setDocuments,
    setCurrentView: state.setCurrentView,
    addToast: state.addToast,
  }));

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [newTag, setNewTag] = useState('');
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dragOverPageIndex, setDragOverPageIndex] = useState<number | null>(null);

  useEffect(() => {
    if (currentDocument) {
      setDocumentName(currentDocument.name);
      loadThumbnails();
    }
  }, [currentDocument]);

  const loadThumbnails = async () => {
    if (!currentDocument) return;

    const newThumbnails = new Map<string, string>();
    for (const page of currentDocument.pages) {
      const url = URL.createObjectURL(page.thumbnailImage);
      newThumbnails.set(page.id, url);
    }
    setThumbnails(newThumbnails);

    return () => {
      thumbnails.forEach((url) => URL.revokeObjectURL(url));
    };
  };

  const handleSaveName = async () => {
    if (!currentDocument || !documentName.trim()) {
      addToast({
        type: 'error',
        message: 'Document name cannot be empty',
      });
      return;
    }

    try {
      const updatedDocument = {
        ...currentDocument,
        name: documentName.trim(),
        updatedAt: new Date(),
      };

      const storageService = await getStorageService();
      await storageService.updateDocument(updatedDocument);

      setCurrentDocument(updatedDocument);

      // Reload documents list
      const docs = await storageService.listDocuments({ sortBy: 'updatedAt', sortOrder: 'desc' });
      setDocuments(docs);

      setIsEditing(false);
      addToast({
        type: 'success',
        message: 'Document name updated',
      });
    } catch (error) {
      console.error('Failed to update document name:', error);
      addToast({
        type: 'error',
        message: 'Failed to update document name',
      });
    }
  };

  const handleAddTag = async () => {
    if (!currentDocument || !newTag.trim()) return;

    const tag = newTag.trim();
    if (currentDocument.tags.includes(tag)) {
      addToast({
        type: 'warning',
        message: 'Tag already exists',
      });
      return;
    }

    try {
      const updatedDocument = {
        ...currentDocument,
        tags: [...currentDocument.tags, tag],
        updatedAt: new Date(),
      };

      const storageService = await getStorageService();
      await storageService.updateDocument(updatedDocument);

      setCurrentDocument(updatedDocument);

      // Reload documents list
      const docs = await storageService.listDocuments({ sortBy: 'updatedAt', sortOrder: 'desc' });
      setDocuments(docs);

      setNewTag('');
      addToast({
        type: 'success',
        message: 'Tag added',
      });
    } catch (error) {
      console.error('Failed to add tag:', error);
      addToast({
        type: 'error',
        message: 'Failed to add tag',
      });
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!currentDocument) return;

    try {
      const updatedDocument = {
        ...currentDocument,
        tags: currentDocument.tags.filter((t) => t !== tag),
        updatedAt: new Date(),
      };

      const storageService = await getStorageService();
      await storageService.updateDocument(updatedDocument);

      setCurrentDocument(updatedDocument);

      // Reload documents list
      const docs = await storageService.listDocuments({ sortBy: 'updatedAt', sortOrder: 'desc' });
      setDocuments(docs);

      addToast({
        type: 'success',
        message: 'Tag removed',
      });
    } catch (error) {
      console.error('Failed to remove tag:', error);
      addToast({
        type: 'error',
        message: 'Failed to remove tag',
      });
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!currentDocument) return;

    if (currentDocument.pages.length === 1) {
      addToast({
        type: 'error',
        message: 'Cannot delete the last page. Delete the document instead.',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this page?')) {
      return;
    }

    try {
      setIsLoading(true);
      const storageService = await getStorageService();
      await storageService.removePage(currentDocument.id, pageId);

      // Reload document
      const updatedDocument = await storageService.getDocument(currentDocument.id);
      if (updatedDocument) {
        setCurrentDocument(updatedDocument);
      }

      // Reload documents list
      const docs = await storageService.listDocuments({ sortBy: 'updatedAt', sortOrder: 'desc' });
      setDocuments(docs);

      addToast({
        type: 'success',
        message: 'Page deleted',
      });
    } catch (error) {
      console.error('Failed to delete page:', error);
      addToast({
        type: 'error',
        message: 'Failed to delete page',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedPageIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverPageIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!currentDocument || draggedPageIndex === null || draggedPageIndex === dropIndex) {
      setDraggedPageIndex(null);
      setDragOverPageIndex(null);
      return;
    }

    try {
      setIsLoading(true);

      // Reorder pages array
      const pages = [...currentDocument.pages];
      const [draggedPage] = pages.splice(draggedPageIndex, 1);
      pages.splice(dropIndex, 0, draggedPage);

      // Get page IDs in new order
      const pageIds = pages.map((p) => p.id);

      const storageService = await getStorageService();
      await storageService.reorderPages(currentDocument.id, pageIds);

      // Reload document
      const updatedDocument = await storageService.getDocument(currentDocument.id);
      if (updatedDocument) {
        setCurrentDocument(updatedDocument);
      }

      // Reload documents list
      const docs = await storageService.listDocuments({ sortBy: 'updatedAt', sortOrder: 'desc' });
      setDocuments(docs);

      addToast({
        type: 'success',
        message: 'Pages reordered',
      });
    } catch (error) {
      console.error('Failed to reorder pages:', error);
      addToast({
        type: 'error',
        message: 'Failed to reorder pages',
      });
    } finally {
      setIsLoading(false);
      setDraggedPageIndex(null);
      setDragOverPageIndex(null);
    }
  };

  const handleExport = () => {
    if (currentDocument) {
      setCurrentView('export');
    }
  };

  const handleOCR = () => {
    if (currentDocument) {
      setCurrentView('ocr');
    }
  };

  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-xl font-semibold mb-2">No Document Selected</h2>
        <Button onClick={() => setCurrentView('documents')} variant="primary" size="lg">
          Back to Documents
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <IconButton
            icon="←"
            onClick={() => setCurrentView('documents')}
            title="Back to documents"
            size="md"
          />
          <div className="flex-1">
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveName();
                    }
                  }}
                />
                <Button onClick={handleSaveName} variant="primary" size="sm">
                  Save
                </Button>
                <Button onClick={() => {
                  setDocumentName(currentDocument.name);
                  setIsEditing(false);
                }} variant="secondary" size="sm">
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{currentDocument.name}</h2>
                <IconButton
                  icon="✏️"
                  onClick={() => setIsEditing(true)}
                  title="Edit name"
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Document Info */}
        <div className="text-sm text-gray-600 space-y-1">
          <div>{currentDocument.pages.length} page{currentDocument.pages.length !== 1 ? 's' : ''}</div>
          <div>Created: {new Date(currentDocument.createdAt).toLocaleString()}</div>
          <div>Updated: {new Date(currentDocument.updatedAt).toLocaleString()}</div>
          {currentDocument.metadata.hasOCR && <div className="text-green-600">✓ OCR completed</div>}
        </div>

        {/* Tags */}
        <div className="mt-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Tags</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {currentDocument.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag();
                }
              }}
            />
            <Button onClick={handleAddTag} variant="secondary" size="sm">
              Add
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          {!currentDocument.metadata.hasOCR && (
            <Button onClick={handleOCR} variant="secondary" size="sm" fullWidth>
              Extract Text
            </Button>
          )}
          <Button onClick={handleExport} variant="primary" size="sm" fullWidth>
            Export
          </Button>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 text-sm text-gray-600">
          Drag and drop pages to reorder them
        </div>
        <div className="grid grid-cols-2 gap-4">
          {currentDocument.pages.map((page, index) => (
            <div
              key={page.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-move ${
                dragOverPageIndex === index && draggedPageIndex !== index
                  ? 'ring-2 ring-blue-500'
                  : ''
              } ${draggedPageIndex === index ? 'opacity-50' : ''}`}
            >
              {/* Thumbnail */}
              <div className="aspect-[3/4] bg-gray-200 relative overflow-hidden rounded-t-lg">
                {thumbnails.has(page.id) ? (
                  <img
                    src={thumbnails.get(page.id)}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-4xl">📄</span>
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={() => handleDeletePage(page.id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                  title="Delete page"
                >
                  ×
                </button>

                {/* Page number badge */}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                  Page {page.pageNumber}
                </div>
              </div>

              {/* Page Info */}
              <div className="p-2 text-xs text-gray-600">
                <div>Filter: {page.filterApplied}</div>
                {page.ocrResult && (
                  <div className="text-green-600 mt-1">✓ OCR available</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3">
            <Spinner size="sm" />
            <span className="text-sm text-gray-700">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};
