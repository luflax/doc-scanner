// Geometry types
export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

// Camera types
export interface CameraConfig {
  facingMode: 'environment' | 'user';
  resolution: {
    ideal: { width: number; height: number };
    min: { width: number; height: number };
  };
  focusMode: 'continuous' | 'manual';
  torch: boolean;
}

export interface CameraCapabilities {
  hasFlash: boolean;
  hasFocus: boolean;
  hasZoom: boolean;
  maxZoom: number;
  supportedResolutions: Array<{ width: number; height: number }>;
}

// Edge Detection types
export interface DetectedEdge {
  contour: Point[];
  confidence: number;
  area: number;
  aspectRatio: number;
  boundingRect: Rectangle;
}

export interface EdgeDetectionConfig {
  cannyThreshold1: number;
  cannyThreshold2: number;
  blurKernelSize: number;
  dilationIterations: number;
  minAreaRatio: number;
  maxAreaRatio: number;
}

// Perspective Correction types
export interface PerspectiveConfig {
  outputWidth: number;
  outputHeight: number;
  preserveAspectRatio: boolean;
  interpolation: 'nearest' | 'linear' | 'cubic' | 'lanczos';
}

export interface TransformResult {
  correctedImage: ImageData;
  transformMatrix: number[][];
  originalCorners: Point[];
  outputDimensions: { width: number; height: number };
}

// Image Enhancement types
export interface EnhancementOptions {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  gamma: number;
  shadows: number;
  highlights: number;
  temperature: number;
}

export interface AutoEnhanceResult {
  enhancedImage: ImageData;
  appliedSettings: EnhancementOptions;
  originalHistogram: Histogram;
  enhancedHistogram: Histogram;
}

export type FilterPreset =
  | 'original'
  | 'document'
  | 'grayscale'
  | 'magic'
  | 'whiteboard'
  | 'book'
  | 'receipt'
  | 'photo'
  | 'blueprint';

export interface Histogram {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
  mean: { r: number; g: number; b: number; l: number };
  std: { r: number; g: number; b: number; l: number };
}

// OCR types
export interface OCRConfig {
  language: string | string[];
  pageSegMode: PageSegMode;
  engineMode: EngineMode;
  preserveInterwordSpaces: boolean;
  characterWhitelist?: string;
  characterBlacklist?: string;
}

export enum PageSegMode {
  AUTO = 3,
  SINGLE_COLUMN = 4,
  SINGLE_BLOCK = 6,
  SINGLE_LINE = 7,
  SINGLE_WORD = 8,
  SPARSE_TEXT = 11,
}

export enum EngineMode {
  TESSERACT_ONLY = 0,
  LSTM_ONLY = 1,
  TESSERACT_LSTM = 2,
  DEFAULT = 3,
}

export interface OCRResult {
  text: string;
  confidence: number;
  words: OCRWord[];
  lines: OCRLine[];
  paragraphs: OCRParagraph[];
  blocks: OCRBlock[];
  processingTime: number;
}

export interface OCRWord {
  text: string;
  confidence: number;
  boundingBox: Rectangle;
  baseline: { x0: number; y0: number; x1: number; y1: number };
}

export interface OCRLine {
  text: string;
  confidence: number;
  boundingBox: Rectangle;
  words: OCRWord[];
}

export interface OCRParagraph {
  text: string;
  confidence: number;
  boundingBox: Rectangle;
  lines: OCRLine[];
}

export interface OCRBlock {
  text: string;
  confidence: number;
  boundingBox: Rectangle;
  paragraphs: OCRParagraph[];
}

export interface OCRProgress {
  status: string;
  progress: number;
}

export interface OrientationResult {
  degrees: number;
  confidence: number;
  script: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  size: string;
  tier: 1 | 2;
}

// Document types
export interface Document {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  pages: DocumentPage[];
  tags: string[];
  metadata: DocumentMetadata;
}

export interface DocumentPage {
  id: string;
  pageNumber: number;
  originalImage: Blob;
  processedImage: Blob;
  thumbnailImage: Blob;
  corners: Point[];
  enhancementSettings: EnhancementOptions;
  filterApplied: FilterPreset;
  ocrResult?: OCRResult;
  dimensions: { width: number; height: number };
}

export interface DocumentMetadata {
  totalPages: number;
  hasOCR: boolean;
  fileSize: number;
  source: 'camera' | 'upload';
  deviceInfo?: string;
}

// Export types
export type ExportFormat = 'pdf' | 'png' | 'jpeg' | 'txt';

export interface PDFExportOptions {
  pageSize: 'a4' | 'letter' | 'legal' | 'original';
  orientation: 'auto' | 'portrait' | 'landscape';
  quality: 'low' | 'medium' | 'high' | 'original';
  includeOCR: boolean;
  compression: boolean;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

export interface ImageExportOptions {
  format: 'png' | 'jpeg';
  quality: number;
  maxDimension?: number;
}

export interface SearchResult {
  documentId: string;
  pageId: string;
  matches: Array<{
    text: string;
    position: number;
    boundingBox?: Rectangle;
  }>;
}

export interface StorageUsage {
  used: number;
  quota: number;
  percentage: number;
}

export interface ListOptions {
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// UI State types
export type ViewType = 'camera' | 'crop' | 'enhance' | 'ocr' | 'documents' | 'export';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}
