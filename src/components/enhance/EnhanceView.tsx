import React from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';

export const EnhanceView: React.FC = () => {
  const { currentImage, setCurrentView } = useStore((state) => ({
    currentImage: state.scanSession.currentImage,
    setCurrentView: state.setCurrentView,
  }));

  if (!currentImage) {
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
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Enhancement features coming soon...</p>
          <div className="space-y-2">
            <Button onClick={() => setCurrentView('crop')} variant="secondary">
              Back
            </Button>
            <Button onClick={() => setCurrentView('documents')} variant="primary">
              Save Document
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
