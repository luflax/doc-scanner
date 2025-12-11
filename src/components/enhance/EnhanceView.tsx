import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { FilterCarousel } from './FilterCarousel';
import { AdjustmentSliders } from './AdjustmentSliders';
import { imageEnhancementService } from '@/services/ImageEnhancementService';
import type { FilterPreset, EnhancementOptions } from '@/types';
import { DEFAULT_ENHANCEMENT_OPTIONS } from '@/constants/filters';

export const EnhanceView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImageData, setCurrentImageData] = useState<ImageData | null>(null);
  const [showAdjustments, setShowAdjustments] = useState(false);

  const {
    processedImage,
    selectedFilter,
    enhancementOptions,
    setCurrentView,
    setSelectedFilter,
    setEnhancementOptions,
    addToast,
  } = useStore((state) => ({
    processedImage: state.scanSession.processedImage,
    selectedFilter: state.scanSession.selectedFilter,
    enhancementOptions: state.scanSession.enhancementOptions,
    setCurrentView: state.setCurrentView,
    setSelectedFilter: state.setSelectedFilter,
    setEnhancementOptions: state.setEnhancementOptions,
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

  const handleSave = () => {
    addToast({
      type: 'info',
      message: 'Document saving feature coming soon!',
    });
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
