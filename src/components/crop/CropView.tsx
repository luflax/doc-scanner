import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { CornerHandles } from './CornerHandles';
import { edgeDetectionService } from '@/services/EdgeDetectionService';
import { perspectiveCorrectionService } from '@/services/PerspectiveCorrectionService';
import type { Point } from '@/types';

export const CropView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const {
    currentImage,
    detectedEdges,
    adjustedCorners,
    setCurrentView,
    resetScanSession,
    setDetectedEdges,
    setAdjustedCorners,
    setProcessedImage,
    addToast,
  } = useStore((state) => ({
    currentImage: state.scanSession.currentImage,
    detectedEdges: state.scanSession.detectedEdges,
    adjustedCorners: state.scanSession.adjustedCorners,
    setCurrentView: state.setCurrentView,
    resetScanSession: state.resetScanSession,
    setDetectedEdges: state.setDetectedEdges,
    setAdjustedCorners: state.setAdjustedCorners,
    setProcessedImage: state.setProcessedImage,
    addToast: state.addToast,
  }));

  // Draw image on canvas
  useEffect(() => {
    if (currentImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = currentImage.width;
      canvas.height = currentImage.height;
      ctx.putImageData(currentImage, 0, 0);
    }
  }, [currentImage]);

  // Detect edges on mount
  useEffect(() => {
    if (currentImage && !detectedEdges && !isDetecting) {
      detectEdges();
    }
  }, [currentImage]);

  // Update container size for corner handles
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const detectEdges = async () => {
    console.log('[CropView] detectEdges() called');
    if (!currentImage) return;

    console.log('[CropView] Setting isDetecting to true');
    setIsDetecting(true);
    try {
      console.log('[CropView] Calling edgeDetectionService.detectDocument()');
      const detected = await edgeDetectionService.detectDocument(currentImage);
      console.log('[CropView] detectDocument() returned:', detected);

      if (detected) {
        setDetectedEdges(detected);
        setAdjustedCorners(detected.contour);
        addToast({
          type: 'success',
          message: 'Document detected!',
        });
      } else {
        // Use default corners (full image)
        const defaultCorners: Point[] = [
          { x: 0, y: 0 },
          { x: currentImage.width, y: 0 },
          { x: currentImage.width, y: currentImage.height },
          { x: 0, y: currentImage.height },
        ];
        setAdjustedCorners(defaultCorners);
        addToast({
          type: 'warning',
          message: 'Could not detect document. Using full image.',
        });
      }
    } catch (error) {
      console.error('[CropView] Edge detection failed:', error);
      addToast({
        type: 'error',
        message: 'Edge detection failed',
      });
    } finally {
      console.log('[CropView] Setting isDetecting to false');
      setIsDetecting(false);
    }
  };

  const handleCornersChange = (newCorners: Point[]) => {
    setAdjustedCorners(newCorners);
  };

  const handleRetake = () => {
    resetScanSession();
    setCurrentView('camera');
  };

  const handleContinue = async () => {
    if (!currentImage || !adjustedCorners) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await perspectiveCorrectionService.correctPerspective(
        currentImage,
        adjustedCorners
      );

      if (result) {
        setProcessedImage(result.correctedImage);
        setCurrentView('enhance');
        addToast({
          type: 'success',
          message: 'Image cropped successfully!',
        });
      } else {
        throw new Error('Perspective correction failed');
      }
    } catch (error) {
      console.error('Perspective correction failed:', error);
      addToast({
        type: 'error',
        message: 'Failed to crop image',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
        <p className="text-gray-600">No image captured</p>
        <Button onClick={() => setCurrentView('camera')} className="mt-4">
          Back to Camera
        </Button>
      </div>
    );
  }

  if (isDetecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900">
        <Spinner size="lg" className="mb-4" />
        <p className="text-white text-sm">Detecting document edges...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Canvas container */}
      <div ref={containerRef} className="flex-1 overflow-hidden flex items-center justify-center p-4 relative">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
        />

        {/* Corner handles overlay */}
        {adjustedCorners && currentImage && containerSize.width > 0 && (
          <CornerHandles
            corners={adjustedCorners}
            imageSize={{ width: currentImage.width, height: currentImage.height }}
            containerSize={containerSize}
            onChange={handleCornersChange}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <Button onClick={handleRetake} variant="secondary" fullWidth disabled={isProcessing}>
            Retake
          </Button>
          <Button onClick={detectEdges} variant="secondary" fullWidth disabled={isProcessing}>
            Auto-Detect
          </Button>
          <Button onClick={handleContinue} variant="primary" fullWidth disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};
