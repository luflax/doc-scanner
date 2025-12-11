import React, { useEffect } from 'react';
import { useStore } from '@/store';
import { useCameraStream } from '@/hooks/useCameraStream';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import { Spinner } from '@/components/common/Spinner';

export const CameraView: React.FC = () => {
  const { addToast, setCameraCapabilities, setCurrentView, startScanSession } = useStore((state) => ({
    addToast: state.addToast,
    setCameraCapabilities: state.setCameraCapabilities,
    setCurrentView: state.setCurrentView,
    startScanSession: state.startScanSession,
  }));

  const {
    videoRef,
    isInitialized,
    isLoading,
    error,
    capabilities,
    facingMode,
    initialize,
    switchCamera,
    capturePhoto,
  } = useCameraStream({
    onError: (err) => {
      addToast({
        type: 'error',
        message: err.message || 'Failed to access camera',
      });
    },
    onInitialized: () => {
      addToast({
        type: 'success',
        message: 'Camera initialized successfully',
      });
    },
  });

  // Update capabilities in store
  useEffect(() => {
    if (capabilities) {
      setCameraCapabilities(capabilities);
    }
  }, [capabilities, setCameraCapabilities]);

  const handleCapture = async () => {
    const imageData = await capturePhoto();
    if (imageData) {
      startScanSession(imageData);
      setCurrentView('crop');

      addToast({
        type: 'success',
        message: 'Image captured successfully',
      });
    }
  };

  const handleSwitchCamera = async () => {
    try {
      await switchCamera();
      addToast({
        type: 'success',
        message: `Switched to ${facingMode === 'environment' ? 'front' : 'back'} camera`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to switch camera',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black">
        <Spinner size="lg" className="mb-4" />
        <p className="text-white text-sm">Initializing camera...</p>
      </div>
    );
  }

  if (error || (!isInitialized && !isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-6">
        <div className="text-6xl mb-4">📷</div>
        <h2 className="text-xl font-semibold mb-2">Camera Access Required</h2>
        {error && (
          <p className="text-sm text-red-600 mb-4 text-center max-w-md">{error.message}</p>
        )}
        <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
          This app needs access to your camera to scan documents. Click the button below to
          grant permission.
        </p>
        <Button onClick={initialize} variant="primary" size="lg">
          Enable Camera
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 p-4">
        <div className="flex justify-end">
          <IconButton
            icon={<span className="text-xl">🔄</span>}
            onClick={handleSwitchCamera}
            className="bg-black/50 text-white hover:bg-black/70"
            label="Switch camera"
          />
        </div>
      </div>

      {/* Camera controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center">
          <Button
            onClick={handleCapture}
            variant="primary"
            size="lg"
            className="rounded-full w-16 h-16 p-0"
          >
            <span className="text-2xl">📸</span>
          </Button>
        </div>
      </div>

      {/* Guide frame overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-full h-full flex items-center justify-center p-8">
          <div className="border-2 border-white border-dashed rounded-lg w-full max-w-md aspect-document opacity-50" />
        </div>
      </div>
    </div>
  );
};
