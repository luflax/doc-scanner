import React, { useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';

export const CropView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { currentImage, setCurrentView, resetScanSession } = useStore((state) => ({
    currentImage: state.scanSession.currentImage,
    setCurrentView: state.setCurrentView,
    resetScanSession: state.resetScanSession,
  }));

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

  const handleRetake = () => {
    resetScanSession();
    setCurrentView('camera');
  };

  const handleContinue = () => {
    setCurrentView('enhance');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Canvas container */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Action buttons */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <Button onClick={handleRetake} variant="secondary" fullWidth>
            Retake
          </Button>
          <Button onClick={handleContinue} variant="primary" fullWidth>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};
