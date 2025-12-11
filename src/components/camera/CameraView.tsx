import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';

export const CameraView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    stream,
    isInitialized,
    setCameraInitialized,
    setCameraStream,
    setCameraError,
    addToast,
  } = useStore((state) => ({
    stream: state.camera.stream,
    isInitialized: state.camera.isInitialized,
    setCameraInitialized: state.setCameraInitialized,
    setCameraStream: state.setCameraStream,
    setCameraError: state.setCameraError,
    addToast: state.addToast,
  }));

  const initializeCamera = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(mediaStream);
      setCameraInitialized(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      addToast({
        type: 'success',
        message: 'Camera initialized successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      setCameraError(err instanceof Error ? err : new Error(errorMessage));
      addToast({
        type: 'error',
        message: 'Failed to access camera. Please grant camera permissions.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !stream) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Store the captured image
      useStore.getState().startScanSession(imageData);
      useStore.getState().setCurrentView('crop');

      addToast({
        type: 'success',
        message: 'Image captured successfully',
      });
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to capture image',
      });
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup: stop camera stream when component unmounts
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
        setCameraInitialized(false);
      }
    };
  }, []);

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
          <p className="text-sm text-red-600 mb-4 text-center max-w-md">{error}</p>
        )}
        <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
          This app needs access to your camera to scan documents. Click the button below to
          grant permission.
        </p>
        <Button onClick={initializeCamera} variant="primary" size="lg">
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

      {/* Camera controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center">
          <Button
            onClick={captureImage}
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
