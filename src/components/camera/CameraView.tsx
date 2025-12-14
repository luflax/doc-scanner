import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store';
import { useCameraStream } from '@/hooks/useCameraStream';
import { useEdgeDetection } from '@/hooks/useEdgeDetection';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import { Spinner } from '@/components/common/Spinner';
import { EdgeOverlay } from './EdgeOverlay';

export const CameraView: React.FC = () => {
  const { addToast, setCameraCapabilities, setCurrentView, startScanSession, setDetectedEdges } = useStore((state) => ({
    addToast: state.addToast,
    setCameraCapabilities: state.setCameraCapabilities,
    setCurrentView: state.setCurrentView,
    startScanSession: state.startScanSession,
    setDetectedEdges: state.setDetectedEdges,
  }));

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [videoReady, setVideoReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Real-time edge detection
  const {
    detectedEdges: realtimeEdges,
    isReady: isEdgeDetectionReady,
    error: edgeDetectionError,
    debugInfo,
  } = useEdgeDetection({
    enabled: isInitialized,
    videoElement: videoRef.current,
    onDetection: (edges) => {
      // Update edges in store for real-time feedback
      setDetectedEdges(edges);
    },
  });

  // Measure container size for overlay positioning
  useEffect(() => {
    console.log('[CameraView] containerRef:', containerRef);
    const container = containerRef.current;
    console.log('[CameraView] container:', container);
    if (!container) return;

    const updateSize = () => {
      let width = container.clientWidth;
      let height = container.clientHeight;

      // Fallback to window dimensions if container reports 0
      // (common issue in PWAs/mobile browsers with h-screen)
      if (width === 0 || height === 0) {
        width = window.innerWidth;
        height = window.innerHeight;
        console.log('[CameraView] Using window dimensions as fallback:', { width, height });
      } else {
        console.log('[CameraView] Container size update:', { width, height });
      }

      if (width > 0 && height > 0) {
        setContainerSize({ width, height });
      }
    };

    // Use ResizeObserver for more reliable size detection
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        let { width, height } = entry.contentRect;

        // Fallback to window dimensions if ResizeObserver reports 0
        if (width === 0 || height === 0) {
          width = window.innerWidth;
          height = window.innerHeight;
          console.log('[CameraView] ResizeObserver fallback to window:', { width, height });
        } else {
          console.log('[CameraView] ResizeObserver:', { width, height });
        }

        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    resizeObserver.observe(container);

    // Also update on window resize
    window.addEventListener('resize', updateSize);

    // Initial measurement - try immediately and after delay
    updateSize();
    const timeout = setTimeout(updateSize, 100);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeout);
    };
  }, [containerRef.current, isInitialized]);

  // Wait for video metadata to load
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleMetadataLoaded = () => {
      console.log('[CameraView] Video metadata loaded:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });
      setVideoReady(true);
    };

    // Check if metadata is already loaded
    if (video.readyState >= video.HAVE_METADATA) {
      handleMetadataLoaded();
    } else {
      video.addEventListener('loadedmetadata', handleMetadataLoaded);
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleMetadataLoaded);
    };
  }, [videoRef.current, isInitialized]);

  // Debug: Log overlay rendering conditions
  useEffect(() => {
    if (realtimeEdges) {
      console.log('[CameraView] Overlay render check:', {
        isEdgeDetectionReady,
        hasEdges: !!realtimeEdges,
        hasVideo: !!videoRef.current,
        videoReady,
        videoWidth: videoRef.current?.videoWidth,
        videoHeight: videoRef.current?.videoHeight,
        containerWidth: containerSize.width,
        containerHeight: containerSize.height,
      });
    }
  }, [
    realtimeEdges,
    isEdgeDetectionReady,
    videoReady,
    containerSize.width,
    containerSize.height,
  ]);

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
    <div ref={containerRef} className="relative w-full h-screen bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Edge detection overlay */}
      {isEdgeDetectionReady &&
        realtimeEdges &&
        videoRef.current &&
        videoReady &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0 &&
        containerSize.width > 0 &&
        containerSize.height > 0 && (
          <EdgeOverlay
            edges={realtimeEdges}
            videoWidth={videoRef.current.videoWidth}
            videoHeight={videoRef.current.videoHeight}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            showConfidence={true}
          />
        )}

      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 p-4">
        <div className="flex justify-between items-center">
          {/* Edge detection status */}
          <div className="bg-black/50 px-3 py-2 rounded-lg">
            {!isEdgeDetectionReady ? (
              <span className="text-xs text-yellow-400">Loading edge detection...</span>
            ) : edgeDetectionError ? (
              <span className="text-xs text-red-400">Edge detection unavailable</span>
            ) : realtimeEdges ? (
              <span className="text-xs text-green-400">Document detected</span>
            ) : (
              <span className="text-xs text-gray-400">Scanning...</span>
            )}
          </div>

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

      {/* Debug overlay - Temporal smoothing info */}
      {isEdgeDetectionReady && (
        <div className="absolute top-16 left-2 right-2 bg-black/90 rounded-lg p-2 text-white text-[10px] font-mono max-h-64 overflow-y-auto">
          <div className="font-bold mb-2 text-center text-sm">
            🔍 Edge Detection Debug
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-400">State:</span>{' '}
              <span
                className={
                  debugInfo.detectionState === 'new'
                    ? 'text-green-400 font-bold'
                    : debugInfo.detectionState === 'cached'
                    ? 'text-yellow-400 font-bold'
                    : 'text-red-400 font-bold'
                }
              >
                {debugInfo.detectionState.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Confidence:</span>{' '}
              <span className="text-white font-bold">
                {(debugInfo.lastConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Using Cache:</span>{' '}
              <span className={debugInfo.isUsingCache ? 'text-yellow-400' : 'text-green-400'}>
                {debugInfo.isUsingCache ? 'YES' : 'NO'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Missed Frames:</span>{' '}
              <span
                className={
                  debugInfo.framesWithoutDetection > 3 ? 'text-red-400' : 'text-green-400'
                }
              >
                {debugInfo.framesWithoutDetection}/5
              </span>
            </div>
          </div>

          {/* Overlay Render Checks */}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="font-bold mb-1 text-center text-xs text-yellow-300">
              Overlay Conditions
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>
                <span className="text-gray-400">hasEdges:</span>{' '}
                <span className={!!realtimeEdges ? 'text-green-400' : 'text-red-400'}>
                  {!!realtimeEdges ? '✓' : '✗'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">videoReady:</span>{' '}
                <span className={videoReady ? 'text-green-400' : 'text-red-400'}>
                  {videoReady ? '✓' : '✗'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">videoW:</span>{' '}
                <span className={videoRef.current && videoRef.current.videoWidth > 0 ? 'text-green-400' : 'text-red-400'}>
                  {videoRef.current?.videoWidth || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-400">videoH:</span>{' '}
                <span className={videoRef.current && videoRef.current.videoHeight > 0 ? 'text-green-400' : 'text-red-400'}>
                  {videoRef.current?.videoHeight || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-400">containerW:</span>{' '}
                <span className={containerSize.width > 0 ? 'text-green-400' : 'text-red-400'}>
                  {containerSize.width}
                </span>
              </div>
              <div>
                <span className="text-gray-400">containerH:</span>{' '}
                <span className={containerSize.height > 0 ? 'text-green-400' : 'text-red-400'}>
                  {containerSize.height}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-700 text-center">
            {debugInfo.detectionState === 'new' && (
              <span className="text-green-400">✓ Fresh detection</span>
            )}
            {debugInfo.detectionState === 'cached' && (
              <span className="text-yellow-400">
                ⏱ Showing cached ({debugInfo.framesWithoutDetection}/5)
              </span>
            )}
            {debugInfo.detectionState === 'none' && (
              <span className="text-red-400">✗ No document detected</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
