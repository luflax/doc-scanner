import React, { useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';

export const EnhanceView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { processedImage, setCurrentView, addToast } = useStore((state) => ({
    processedImage: state.scanSession.processedImage,
    setCurrentView: state.setCurrentView,
    addToast: state.addToast,
  }));

  // Draw processed image on canvas
  useEffect(() => {
    if (processedImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = processedImage.width;
      canvas.height = processedImage.height;
      ctx.putImageData(processedImage, 0, 0);
    }
  }, [processedImage]);

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

  const handleSave = () => {
    addToast({
      type: 'info',
      message: 'Document saving feature coming soon!',
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Canvas container */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain shadow-2xl"
        />
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border-b border-blue-200 p-3">
        <p className="text-sm text-blue-800 text-center">
          Enhancement filters coming soon! For now, you can save the cropped document.
        </p>
      </div>

      {/* Action buttons */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <Button onClick={() => setCurrentView('crop')} variant="secondary" fullWidth>
            Back
          </Button>
          <Button onClick={handleSave} variant="primary" fullWidth>
            Save Document
          </Button>
        </div>
      </div>
    </div>
  );
};
