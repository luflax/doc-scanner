/**
 * useEdgeDetection Hook
 * Real-time edge detection for camera preview
 * Processes frames at optimized intervals for performance
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadOpenCV, isOpenCVLoaded } from '@/lib/opencv-loader';
import { edgeDetector } from '@/services/EdgeDetector';
import type { DetectedEdge } from '@/types';
import { PREVIEW_CONSTRAINTS } from '@/constants/camera';

interface UseEdgeDetectionOptions {
  enabled?: boolean;
  videoElement: HTMLVideoElement | null;
  onDetection?: (edges: DetectedEdge | null) => void;
  targetFPS?: number;
  skipFrames?: number;
}

interface UseEdgeDetectionResult {
  detectedEdges: DetectedEdge | null;
  isProcessing: boolean;
  isReady: boolean;
  error: Error | null;
  // Debug info
  debugInfo: {
    framesWithoutDetection: number;
    isUsingCache: boolean;
    lastConfidence: number;
    detectionState: 'new' | 'cached' | 'none';
  };
}

// Temporal smoothing configuration
const TEMPORAL_SMOOTHING = {
  enabled: true,
  keepFrames: 5, // Keep last detection for 5 failed frames (~333ms at 15fps)
  minConfidenceToUpdate: 0.3, // Only update if new detection has at least 30% confidence
};

export function useEdgeDetection({
  enabled = true,
  videoElement,
  onDetection,
  targetFPS = PREVIEW_CONSTRAINTS.targetFPS,
  skipFrames = PREVIEW_CONSTRAINTS.skipFrames,
}: UseEdgeDetectionOptions): UseEdgeDetectionResult {
  const [detectedEdges, setDetectedEdges] = useState<DetectedEdge | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [debugInfo, setDebugInfo] = useState({
    framesWithoutDetection: 0,
    isUsingCache: false,
    lastConfidence: 0,
    detectionState: 'none' as 'new' | 'cached' | 'none',
  });

  const frameCountRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastProcessTimeRef = useRef(0);
  const lastGoodDetectionRef = useRef<DetectedEdge | null>(null);
  const framesWithoutDetectionRef = useRef(0);

  // Initialize OpenCV
  useEffect(() => {
    if (!enabled) return;

    const initOpenCV = async () => {
      try {
        if (!isOpenCVLoaded()) {
          console.log('[useEdgeDetection] Loading OpenCV...');
          await loadOpenCV();
          console.log('[useEdgeDetection] OpenCV loaded successfully');
        }
        setIsReady(true);
      } catch (err) {
        console.error('[useEdgeDetection] Failed to load OpenCV:', err);
        setError(err as Error);
      }
    };

    initOpenCV();
  }, [enabled]);

  // Process video frame
  const processFrame = useCallback(() => {
    if (!enabled || !isReady || !videoElement || isProcessing) {
      return;
    }

    // Skip frames for performance
    frameCountRef.current++;
    if (frameCountRef.current % (skipFrames + 1) !== 0) {
      return;
    }

    // Throttle processing based on target FPS
    const now = performance.now();
    const elapsed = now - lastProcessTimeRef.current;
    const minInterval = 1000 / targetFPS;

    if (elapsed < minInterval) {
      return;
    }

    lastProcessTimeRef.current = now;

    // Ensure video is ready
    if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      const width = Math.min(PREVIEW_CONSTRAINTS.maxWidth, videoElement.videoWidth);
      const height = Math.min(PREVIEW_CONSTRAINTS.maxHeight, videoElement.videoHeight);

      // Scale down for performance
      const scale = Math.min(
        PREVIEW_CONSTRAINTS.maxWidth / videoElement.videoWidth,
        PREVIEW_CONSTRAINTS.maxHeight / videoElement.videoHeight,
        1.0
      );

      canvas.width = videoElement.videoWidth * scale;
      canvas.height = videoElement.videoHeight * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw current video frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Detect edges (fast method for real-time)
      const rawEdges = edgeDetector.detectDocumentFast(imageData);

      // Scale corners back to original video resolution if edges detected
      let edges = rawEdges;
      if (edges && scale !== 1.0) {
        edges.contour = edges.contour.map((point) => ({
          x: point.x / scale,
          y: point.y / scale,
        }));
        edges.boundingRect.x /= scale;
        edges.boundingRect.y /= scale;
        edges.boundingRect.width /= scale;
        edges.boundingRect.height /= scale;
      }

      // Apply temporal smoothing to reduce flickering
      let finalEdges: DetectedEdge | null = null;

      if (TEMPORAL_SMOOTHING.enabled) {
        if (edges && edges.confidence >= TEMPORAL_SMOOTHING.minConfidenceToUpdate) {
          // Good detection found - reset counter and update
          framesWithoutDetectionRef.current = 0;
          lastGoodDetectionRef.current = edges;
          finalEdges = edges;

          setDebugInfo({
            framesWithoutDetection: 0,
            isUsingCache: false,
            lastConfidence: edges.confidence,
            detectionState: 'new',
          });

          console.log(
            `[EdgeDetection] New detection (conf: ${edges.confidence.toFixed(2)})`
          );
        } else {
          // No detection or low confidence - use last good detection if available
          framesWithoutDetectionRef.current++;

          if (
            lastGoodDetectionRef.current &&
            framesWithoutDetectionRef.current <= TEMPORAL_SMOOTHING.keepFrames
          ) {
            // Keep showing last good detection
            finalEdges = lastGoodDetectionRef.current;

            setDebugInfo({
              framesWithoutDetection: framesWithoutDetectionRef.current,
              isUsingCache: true,
              lastConfidence: lastGoodDetectionRef.current.confidence,
              detectionState: 'cached',
            });

            console.log(
              `[EdgeDetection] Using cached (${framesWithoutDetectionRef.current}/${TEMPORAL_SMOOTHING.keepFrames} frames)`
            );
          } else {
            // Too many frames without detection - clear it
            finalEdges = null;
            lastGoodDetectionRef.current = null;

            setDebugInfo({
              framesWithoutDetection: framesWithoutDetectionRef.current,
              isUsingCache: false,
              lastConfidence: 0,
              detectionState: 'none',
            });

            console.log('[EdgeDetection] Cleared - too many frames without detection');
          }
        }
      } else {
        // No smoothing - use raw detection
        finalEdges = edges;
      }

      setDetectedEdges(finalEdges);

      if (onDetection) {
        onDetection(finalEdges);
      }
    } catch (err) {
      console.error('[useEdgeDetection] Frame processing error:', err);
      setError(err as Error);
    } finally {
      setIsProcessing(false);
    }
  }, [enabled, isReady, videoElement, isProcessing, onDetection, targetFPS, skipFrames]);

  // Animation loop for continuous detection
  useEffect(() => {
    if (!enabled || !isReady || !videoElement) {
      return;
    }

    const loop = () => {
      processFrame();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, isReady, videoElement, processFrame]);

  return {
    detectedEdges,
    isProcessing,
    isReady,
    error,
    debugInfo,
  };
}
