import React, { useState, useRef, useEffect } from 'react';
import type { Point, Size } from '@/types';

interface CornerHandlesProps {
  corners: Point[];
  imageSize: Size;
  containerSize: Size;
  onChange: (corners: Point[]) => void;
  onCommit?: () => void;
  className?: string;
}

export const CornerHandles: React.FC<CornerHandlesProps> = ({
  corners,
  imageSize,
  containerSize,
  onChange,
  onCommit,
  className = '',
}) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [localCorners, setLocalCorners] = useState<Point[]>(corners);
  const svgRef = useRef<SVGSVGElement>(null);

  // Update local corners when props change
  useEffect(() => {
    setLocalCorners(corners);
  }, [corners]);

  // Calculate scale factor to convert image coordinates to container coordinates
  const getScale = (): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } => {
    const imageAspect = imageSize.width / imageSize.height;
    const containerAspect = containerSize.width / containerSize.height;

    let scaleX: number, scaleY: number;
    let offsetX = 0;
    let offsetY = 0;

    if (imageAspect > containerAspect) {
      // Image is wider - fit to width
      scaleX = containerSize.width / imageSize.width;
      scaleY = scaleX;
      offsetY = (containerSize.height - imageSize.height * scaleY) / 2;
    } else {
      // Image is taller - fit to height
      scaleY = containerSize.height / imageSize.height;
      scaleX = scaleY;
      offsetX = (containerSize.width - imageSize.width * scaleX) / 2;
    }

    return { scaleX, scaleY, offsetX, offsetY };
  };

  // Convert image coordinates to SVG coordinates
  const imageToSVG = (point: Point): Point => {
    const { scaleX, scaleY, offsetX, offsetY } = getScale();
    return {
      x: point.x * scaleX + offsetX,
      y: point.y * scaleY + offsetY,
    };
  };

  // Convert SVG coordinates to image coordinates
  const svgToImage = (point: Point): Point => {
    const { scaleX, scaleY, offsetX, offsetY } = getScale();
    return {
      x: (point.x - offsetX) / scaleX,
      y: (point.y - offsetY) / scaleY,
    };
  };

  // Get SVG coordinates from mouse/touch event
  const getSVGPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    let clientX: number, clientY: number;

    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Handle mouse/touch down
  const handlePointerDown = (index: number) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingIndex(index);
  };

  // Handle mouse/touch move
  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (draggingIndex === null) return;

    e.preventDefault();
    const svgPoint = getSVGPoint(e);
    const imagePoint = svgToImage(svgPoint);

    // Clamp to image bounds
    const clampedPoint = {
      x: Math.max(0, Math.min(imageSize.width, imagePoint.x)),
      y: Math.max(0, Math.min(imageSize.height, imagePoint.y)),
    };

    // Update local corners
    const newCorners = [...localCorners];
    newCorners[draggingIndex] = clampedPoint;
    setLocalCorners(newCorners);
    onChange(newCorners);
  };

  // Handle mouse/touch up
  const handlePointerUp = () => {
    if (draggingIndex !== null) {
      setDraggingIndex(null);
      onCommit?.();
    }
  };

  // Convert corners to SVG coordinates
  const svgCorners = localCorners.map(imageToSVG);

  // Create polygon path
  const polygonPath = svgCorners.length === 4
    ? `M ${svgCorners[0].x} ${svgCorners[0].y} L ${svgCorners[1].x} ${svgCorners[1].y} L ${svgCorners[2].x} ${svgCorners[2].y} L ${svgCorners[3].x} ${svgCorners[3].y} Z`
    : '';

  return (
    <svg
      ref={svgRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ touchAction: 'none' }}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
    >
      {/* Polygon overlay */}
      {polygonPath && (
        <>
          {/* Semi-transparent fill */}
          <path
            d={polygonPath}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="none"
          />
          {/* Border */}
          <path
            d={polygonPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
        </>
      )}

      {/* Corner handles */}
      {svgCorners.map((corner, index) => (
        <g key={index}>
          {/* Larger touch target */}
          <circle
            cx={corner.x}
            cy={corner.y}
            r="20"
            fill="transparent"
            style={{ cursor: 'grab' }}
            onMouseDown={handlePointerDown(index)}
            onTouchStart={handlePointerDown(index)}
          />
          {/* Visible handle */}
          <circle
            cx={corner.x}
            cy={corner.y}
            r="8"
            fill="white"
            stroke="#3b82f6"
            strokeWidth="3"
            style={{ cursor: 'grab', pointerEvents: 'none' }}
          />
          {/* Center dot */}
          <circle
            cx={corner.x}
            cy={corner.y}
            r="3"
            fill="#3b82f6"
            style={{ pointerEvents: 'none' }}
          />
        </g>
      ))}

      {/* Edge lines connecting corners */}
      {svgCorners.length === 4 && svgCorners.map((corner, index) => {
        const nextCorner = svgCorners[(index + 1) % 4];
        return (
          <line
            key={`line-${index}`}
            x1={corner.x}
            y1={corner.y}
            x2={nextCorner.x}
            y2={nextCorner.y}
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="5,5"
            style={{ pointerEvents: 'none' }}
          />
        );
      })}
    </svg>
  );
};
