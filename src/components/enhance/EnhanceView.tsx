import React, { useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { FilterCarousel } from './FilterCarousel';
import { AdjustmentSliders } from './AdjustmentSliders';
import { imageEnhancementService } from '@/services/ImageEnhancementService';
import { getStorageService } from '@/services/StorageService';
import type { FilterPreset, EnhancementOptions, Document, DocumentPage } from '@/types';
import { DEFAULT_ENHANCEMENT_OPTIONS } from '@/constants/filters';

export const EnhanceView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImageData, setCurrentImageData] = useState<ImageData | null>(null);
  const [showAdjustments, setShowAdjustments] = useState(false);

  const {
    currentImage,
    processedImage,
    adjustedCorners,
    selectedFilter,
    enhancementOptions,
    setCurrentView,
    setSelectedFilter,
    setEnhancementOptions,
    addDocument,
    resetScanSession,
    addToast,
  } = useStore((state) => ({
    currentImage: state.scanSession.currentImage,
    processedImage: state.scanSession.processedImage,
    adjustedCorners: state.scanSession.adjustedCorners,
    selectedFilter: state.scanSession.selectedFilter,
    enhancementOptions: state.scanSession.enhancementOptions,
    setCurrentView: state.setCurrentView,
    setSelectedFilter: state.setSelectedFilter,
    setEnhancementOptions: state.setEnhancementOptions,
    addDocument: state.addDocument,
    resetScanSession: state.resetScanSession,
    addToast: state.addToast,
  }));

  // Initialize with processed image
  useEffect(() => {
    if (processedImage && !currentImageData) {
      setCurrentImageData(processedImage);
      drawImageToCanvas(processedImage);
    }
  }, [processedImage]);

  // Apply filter when selection changes
  useEffect(() => {
    if (processedImage) {
      applyFilter(selectedFilter);
    }
  }, [selectedFilter]);

  // Apply manual adjustments
  useEffect(() => {
    if (currentImageData && hasManualAdjustments(enhancementOptions)) {
      applyManualAdjustments();
    }
  }, [enhancementOptions]);

  const drawImageToCanvas = (imageData: ImageData) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
  };

  const applyFilter = async (filter: FilterPreset) => {
    if (!processedImage) return;

    setIsProcessing(true);
    try {
      const result = await imageEnhancementService.applyFilter(processedImage, filter);

      if (result) {
        setCurrentImageData(result);
        drawImageToCanvas(result);

        // Reset manual adjustments when changing filter
        setEnhancementOptions(DEFAULT_ENHANCEMENT_OPTIONS);
      } else {
        addToast({
          type: 'error',
          message: 'Failed to apply filter',
        });
      }
    } catch (error) {
      console.error('Filter application failed:', error);
      addToast({
        type: 'error',
        message: 'Filter application failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyManualAdjustments = async () => {
    if (!currentImageData) return;

    setIsProcessing(true);
    try {
      // Get the base filtered image (reapply current filter to processed image)
      let baseImage = processedImage;
      if (selectedFilter !== 'original') {
        baseImage = await imageEnhancementService.applyFilter(processedImage!, selectedFilter);
      }

      if (!baseImage) {
        throw new Error('Failed to get base image');
      }

      // Apply manual adjustments on top of filtered image
      const result = await imageEnhancementService.enhance(baseImage, enhancementOptions);

      if (result) {
        setCurrentImageData(result);
        drawImageToCanvas(result);
      } else {
        addToast({
          type: 'error',
          message: 'Failed to apply adjustments',
        });
      }
    } catch (error) {
      console.error('Manual adjustment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const hasManualAdjustments = (options: EnhancementOptions): boolean => {
    return (
      options.brightness !== 0 ||
      options.contrast !== 0 ||
      options.saturation !== 0 ||
      options.gamma !== 1.0
    );
  };

  const handleFilterSelect = (filter: FilterPreset) => {
    setSelectedFilter(filter);
  };

  const handleAdjustmentChange = (options: EnhancementOptions) => {
    setEnhancementOptions(options);
  };

  const handleSave = async () => {
    if (!currentImageData || !currentImage) {
      addToast({
        type: 'error',
        message: 'No image to save',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Convert ImageData to Blob for storage
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      canvas.width = currentImageData.width;
      canvas.height = currentImageData.height;
      ctx.putImageData(currentImageData, 0, 0);

      const processedBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
        }, 'image/png');
      });

      // Convert original ImageData to Blob
      const originalCanvas = document.createElement('canvas');
      const originalCtx = originalCanvas.getContext('2d');
      if (!originalCtx) throw new Error('Failed to get canvas context');

      originalCanvas.width = currentImage.width;
      originalCanvas.height = currentImage.height;
      originalCtx.putImageData(currentImage, 0, 0);

      const originalBlob = await new Promise<Blob>((resolve, reject) => {
        originalCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
        }, 'image/png');
      });

      // Create thumbnail (smaller version for grid view)
      const thumbnailCanvas = document.createElement('canvas');
      const thumbnailCtx = thumbnailCanvas.getContext('2d');
      if (!thumbnailCtx) throw new Error('Failed to get canvas context');

      const maxThumbSize = 300;
      const scale = Math.min(
        maxThumbSize / currentImageData.width,
        maxThumbSize / currentImageData.height
      );

      thumbnailCanvas.width = currentImageData.width * scale;
      thumbnailCanvas.height = currentImageData.height * scale;
      thumbnailCtx.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

      const thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
        thumbnailCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
        }, 'image/jpeg', 0.8);
      });

      // Create document page
      const page: DocumentPage = {
        id: uuidv4(),
        pageNumber: 1,
        originalImage: originalBlob,
        processedImage: processedBlob,
        thumbnailImage: thumbnailBlob,
        corners: adjustedCorners || [],
        enhancementSettings: enhancementOptions,
        filterApplied: selectedFilter,
        dimensions: {
          width: currentImageData.width,
          height: currentImageData.height,
        },
      };

      // Create document
      const now = new Date();
      const documentName = `Document ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      const newDocument: Document = {
        id: uuidv4(),
        name: documentName,
        createdAt: now,
        updatedAt: now,
        pages: [page],
        tags: [],
        metadata: {
          totalPages: 1,
          hasOCR: false,
          fileSize: processedBlob.size,
          source: 'camera',
        },
      };

      // Save to storage
      const storageService = await getStorageService();
      await storageService.createDocument(newDocument);

      // Update store
      addDocument(newDocument);

      // Reset scan session
      resetScanSession();

      addToast({
        type: 'success',
        message: 'Document saved successfully',
      });

      // Navigate to documents view
      setCurrentView('documents');
    } catch (error) {
      console.error('Failed to save document:', error);
      addToast({
        type: 'error',
        message: 'Failed to save document',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!processedImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
        <p className="text-gray-600">No image to enhance</p>
        <Button onClick={() => setCurrentView('camera')} className="mt-4">
          Back to Camera
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Canvas container */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4 relative">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain shadow-2xl"
        />

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 flex items-center gap-3">
              <Spinner size="sm" />
              <span className="text-sm text-gray-700">Processing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter carousel */}
      <FilterCarousel
        selectedFilter={selectedFilter}
        onSelect={handleFilterSelect}
        disabled={isProcessing}
      />

      {/* Adjustment controls toggle */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <button
          onClick={() => setShowAdjustments(!showAdjustments)}
          className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>Manual Adjustments</span>
          <span className="text-lg">{showAdjustments ? '▼' : '▶'}</span>
        </button>
      </div>

      {/* Adjustment sliders */}
      {showAdjustments && (
        <div className="bg-gray-50 border-t border-gray-200 max-h-80 overflow-y-auto">
          <AdjustmentSliders
            options={enhancementOptions}
            onChange={handleAdjustmentChange}
            disabled={isProcessing}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <Button
            onClick={() => setCurrentView('crop')}
            variant="secondary"
            fullWidth
            disabled={isProcessing}
          >
            Back
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            fullWidth
            disabled={isProcessing}
          >
            Save Document
          </Button>
        </div>
      </div>
    </div>
  );
};
