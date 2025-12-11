import { useEffect, useRef, useState } from 'react';
import { cameraService } from '@/services/CameraService';
import type { CameraCapabilities } from '@/types';

interface UseCameraStreamOptions {
  autoStart?: boolean;
  facingMode?: 'environment' | 'user';
  onError?: (error: Error) => void;
  onInitialized?: (stream: MediaStream) => void;
}

export const useCameraStream = (options: UseCameraStreamOptions = {}) => {
  const { autoStart = false, facingMode = 'environment', onError, onInitialized } = options;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const initialize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await cameraService.initialize({ facingMode });
      setStream(mediaStream);
      setIsInitialized(true);

      // Get capabilities
      const caps = cameraService.getCapabilities();
      setCapabilities(caps);

      // Attach to video element if ref is set
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      onInitialized?.(mediaStream);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize camera');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchCamera = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newStream = await cameraService.switchCamera();
      setStream(newStream);

      // Update capabilities
      const caps = cameraService.getCapabilities();
      setCapabilities(caps);

      // Update video element
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      onInitialized?.(newStream);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to switch camera');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const capturePhoto = async (): Promise<ImageData | null> => {
    if (!videoRef.current || !stream) {
      setError(new Error('Camera not ready'));
      return null;
    }

    try {
      return await cameraService.capturePhoto(videoRef.current);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to capture photo');
      setError(error);
      onError?.(error);
      return null;
    }
  };

  const setZoom = async (level: number) => {
    try {
      await cameraService.setZoom(level);
    } catch (err) {
      console.error('Zoom failed:', err);
    }
  };

  const toggleFlash = async (enabled: boolean) => {
    try {
      await cameraService.toggleFlash(enabled);
    } catch (err) {
      console.error('Flash toggle failed:', err);
    }
  };

  const dispose = () => {
    cameraService.dispose();
    setStream(null);
    setIsInitialized(false);
    setCapabilities(null);
  };

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      initialize();
    }

    // Cleanup on unmount
    return () => {
      dispose();
    };
  }, []); // Only run once on mount

  return {
    // State
    stream,
    isInitialized,
    isLoading,
    error,
    capabilities,
    videoRef,

    // Actions
    initialize,
    switchCamera,
    capturePhoto,
    setZoom,
    toggleFlash,
    dispose,

    // Current facing mode
    facingMode: cameraService.getCurrentFacingMode(),
  };
};
