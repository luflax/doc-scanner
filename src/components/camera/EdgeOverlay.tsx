/**
 * EdgeOverlay Component
 * Displays detected document edges as an overlay on camera preview
 */

import React from 'react';
import type { DetectedEdge, Point } from '@/types';

interface EdgeOverlayProps {
  edges: DetectedEdge | null;
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
  showConfidence?: boolean;
}

export const EdgeOverlay: React.FC<EdgeOverlayProps> = ({
  edges,
  videoWidth,
  videoHeight,
  containerWidth,
  containerHeight,
  showConfidence = true,
}) => {
  console.log('[EdgeOverlay] Rendering with:', {
    edges: !!edges,
    videoWidth,
    videoHeight,
    containerWidth,
    containerHeight,
    corners: edges?.contour.length,
  });

  if (!edges || !videoWidth || !videoHeight) {
    console.log('[EdgeOverlay] Early return - missing required data');
    return null;
  }

  // Calculate scale to fit video in container (maintaining aspect ratio)
  const scaleX = containerWidth / videoWidth;
  const scaleY = containerHeight / videoHeight;
  const scale = Math.min(scaleX, scaleY);

  // Calculate offset to center the video in container
  const scaledVideoWidth = videoWidth * scale;
  const scaledVideoHeight = videoHeight * scale;
  const offsetX = (containerWidth - scaledVideoWidth) / 2;
  const offsetY = (containerHeight - scaledVideoHeight) / 2;

  // Transform point from video coordinates to container coordinates
  const transformPoint = (point: Point): Point => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  });

  // Transform all corner points
  const transformedCorners = edges.contour.map(transformPoint);

  // Create SVG path for the detected document
  const createPath = (corners: Point[]): string => {
    if (corners.length < 3) return '';

    const path = corners
      .map((corner, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${corner.x} ${corner.y}`;
      })
      .join(' ');

    return `${path} Z`; // Close the path
  };

  const path = createPath(transformedCorners);

  // Determine color based on confidence
  const getColor = (confidence: number): string => {
    if (confidence >= 0.7) return '#22c55e'; // Green - high confidence
    if (confidence >= 0.4) return '#eab308'; // Yellow - medium confidence
    return '#ef4444'; // Red - low confidence
  };

  const color = getColor(edges.confidence);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={containerWidth}
      height={containerHeight}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Fill area */}
      <path d={path} fill={color} fillOpacity={0.2} />

      {/* Border */}
      <path d={path} stroke={color} strokeWidth={3} fill="none" strokeLinejoin="round" />

      {/* Corner points */}
      {transformedCorners.map((corner, index) => (
        <circle
          key={index}
          cx={corner.x}
          cy={corner.y}
          r={8}
          fill={color}
          stroke="white"
          strokeWidth={2}
        />
      ))}

      {/* Confidence indicator */}
      {showConfidence && (
        <g>
          {/* Background */}
          <rect x={10} y={10} width={120} height={40} fill="rgba(0, 0, 0, 0.7)" rx={8} />

          {/* Text */}
          <text x={70} y={25} fontSize={12} fill="white" textAnchor="middle" fontWeight="bold">
            Document
          </text>
          <text x={70} y={40} fontSize={11} fill={color} textAnchor="middle">
            {(edges.confidence * 100).toFixed(0)}% confident
          </text>
        </g>
      )}

      {/* Helper text when confidence is low */}
      {edges.confidence < 0.4 && (
        <g>
          <rect
            x={containerWidth / 2 - 100}
            y={containerHeight - 60}
            width={200}
            height={50}
            fill="rgba(0, 0, 0, 0.7)"
            rx={8}
          />
          <text
            x={containerWidth / 2}
            y={containerHeight - 35}
            fontSize={12}
            fill="white"
            textAnchor="middle"
            fontWeight="bold"
          >
            Adjust position
          </text>
          <text
            x={containerWidth / 2}
            y={containerHeight - 20}
            fontSize={11}
            fill="#eab308"
            textAnchor="middle"
          >
            for better detection
          </text>
        </g>
      )}
    </svg>
  );
};
