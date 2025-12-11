# Mobile Document Scanner Web App - Technical Specification

## Executive Summary

A Progressive Web App (PWA) that transforms smartphone cameras into professional document scanners with advanced image processing, OCR capabilities, and automatic enhancement features.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Core Modules Specification](#3-core-modules-specification)
4. [API Design](#4-api-design)
5. [Data Models](#5-data-models)
6. [Image Processing Pipeline](#6-image-processing-pipeline)
7. [UI/UX Components](#7-uiux-components)
8. [File Structure](#8-file-structure)
9. [Implementation Phases](#9-implementation-phases)
10. [Performance Requirements](#10-performance-requirements)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   Camera    │  │   Image     │  │    OCR      │  │  Document  │ │
│  │   Module    │  │  Processing │  │   Engine    │  │  Manager   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         │                │                │                │        │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐ │
│  │                    Core Application Layer                       │ │
│  │         (State Management, Event Bus, Service Workers)          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Storage Layer                                 │ │
│  │            (IndexedDB, LocalStorage, Cache API)                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Processing Pipeline Flow

```
Camera Input → Edge Detection → Perspective Correction → Enhancement → OCR → Export
     │              │                   │                    │          │       │
     ▼              ▼                   ▼                    ▼          ▼       ▼
  MediaStream   OpenCV.js         Homography           Filters     Tesseract  PDF/IMG
  API           Canny Edge        Transform            Sharpen     .js        Export
                Detection         Matrix               Denoise
```

---

## 2. Technology Stack

### 2.1 Frontend Framework

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| Framework | React | 18.x | Component-based architecture, hooks for state management |
| Language | TypeScript | 5.x | Type safety, better IDE support, maintainability |
| Build Tool | Vite | 5.x | Fast HMR, optimized production builds |
| Styling | Tailwind CSS | 3.x | Utility-first, mobile-responsive design |
| State Management | Zustand | 4.x | Lightweight, simple API, good TypeScript support |

### 2.2 Image Processing Libraries

| Library | Purpose | Implementation Details |
|---------|---------|----------------------|
| **OpenCV.js** | Edge detection, perspective correction, contour detection | WebAssembly build (~8MB), loaded on-demand |
| **Tesseract.js** | OCR text extraction | Web Worker based, supports 100+ languages |
| **Sharp (via WASM)** | Image format conversion, resizing | For export optimization |
| **Canvas API** | Real-time preview, filter application | Native browser API |
| **WebGL** | GPU-accelerated image filters | Performance-critical operations |

### 2.3 PWA Technologies

| Technology | Purpose |
|------------|---------|
| Service Workers | Offline functionality, caching |
| Web App Manifest | Install prompt, splash screen, icons |
| Cache API | Asset and document caching |
| IndexedDB | Document storage, OCR results |
| Background Sync | Queue uploads when offline |

### 2.4 Camera APIs

| API | Purpose | Fallback |
|-----|---------|----------|
| `MediaDevices.getUserMedia()` | Camera access | File input picker |
| `ImageCapture API` | Photo capture with settings | Canvas capture from video |
| `MediaStream Track Capabilities` | Camera controls (focus, zoom) | Manual adjustment |

---

## 3. Core Modules Specification

### 3.1 Camera Module (`/src/modules/camera/`)

#### 3.1.1 CameraService Class

```typescript
interface CameraConfig {
  facingMode: 'environment' | 'user';
  resolution: {
    ideal: { width: number; height: number };
    min: { width: number; height: number };
  };
  focusMode: 'continuous' | 'manual';
  torch: boolean;
}

interface CameraCapabilities {
  hasFlash: boolean;
  hasFocus: boolean;
  hasZoom: boolean;
  maxZoom: number;
  supportedResolutions: Array<{ width: number; height: number }>;
}

class CameraService {
  // Initialize camera with optimal settings
  async initialize(config: CameraConfig): Promise<MediaStream>;

  // Capture high-resolution photo
  async capturePhoto(): Promise<ImageData>;

  // Get real-time frame for preview processing
  getVideoFrame(): ImageData;

  // Camera control methods
  setZoom(level: number): void;
  toggleFlash(): void;
  setFocusPoint(x: number, y: number): void;

  // Cleanup
  dispose(): void;
}
```

#### 3.1.2 Camera Constraints Configuration

```typescript
const CAMERA_CONSTRAINTS = {
  mobile: {
    video: {
      facingMode: { exact: 'environment' },
      width: { ideal: 3840, min: 1920 },
      height: { ideal: 2160, min: 1080 },
      frameRate: { ideal: 30, max: 60 },
      focusMode: 'continuous',
      exposureMode: 'continuous',
      whiteBalanceMode: 'continuous'
    },
    audio: false
  },
  fallback: {
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    },
    audio: false
  }
};
```

### 3.2 Edge Detection Module (`/src/modules/edge-detection/`)

#### 3.2.1 EdgeDetector Class

```typescript
interface DetectedEdge {
  contour: Point[];           // Array of corner points
  confidence: number;         // 0-1 confidence score
  area: number;              // Detected area in pixels
  aspectRatio: number;       // Width/height ratio
  boundingRect: Rectangle;   // Bounding box
}

interface EdgeDetectionConfig {
  cannyThreshold1: number;    // Default: 50
  cannyThreshold2: number;    // Default: 150
  blurKernelSize: number;     // Default: 5
  dilationIterations: number; // Default: 2
  minAreaRatio: number;       // Minimum document area as % of image
  maxAreaRatio: number;       // Maximum document area as % of image
}

class EdgeDetector {
  private cv: OpenCV;

  constructor();

  // Main detection method
  async detectDocument(imageData: ImageData): Promise<DetectedEdge | null>;

  // Real-time detection for preview (optimized, lower resolution)
  detectDocumentFast(imageData: ImageData): DetectedEdge | null;

  // Manual corner adjustment
  refineCorners(corners: Point[], imageData: ImageData): Point[];

  // Algorithm pipeline (internal)
  private preprocess(mat: Mat): Mat;
  private findContours(mat: Mat): Contour[];
  private filterContours(contours: Contour[]): Contour[];
  private orderCorners(contour: Point[]): Point[];
}
```

#### 3.2.2 Edge Detection Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│                  EDGE DETECTION PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PREPROCESSING                                                │
│     ├── Convert to grayscale                                     │
│     ├── Apply Gaussian blur (kernel: 5x5)                        │
│     └── Optional: Histogram equalization for low contrast        │
│                                                                  │
│  2. EDGE DETECTION                                               │
│     ├── Apply Canny edge detector                                │
│     │   ├── Threshold1: 50 (adjustable)                          │
│     │   └── Threshold2: 150 (adjustable)                         │
│     └── Dilate edges to close gaps (iterations: 2)               │
│                                                                  │
│  3. CONTOUR DETECTION                                            │
│     ├── Find all contours (cv.findContours)                      │
│     ├── Approximate contours to polygons (cv.approxPolyDP)       │
│     └── Filter for 4-sided polygons                              │
│                                                                  │
│  4. CONTOUR SCORING                                              │
│     ├── Score by area (larger = better)                          │
│     ├── Score by convexity                                       │
│     ├── Score by aspect ratio (document-like ratios)             │
│     └── Select highest scoring quadrilateral                     │
│                                                                  │
│  5. CORNER ORDERING                                              │
│     └── Order corners: top-left, top-right, bottom-right,        │
│         bottom-left (clockwise from top-left)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Perspective Correction Module (`/src/modules/perspective/`)

#### 3.3.1 PerspectiveCorrector Class

```typescript
interface PerspectiveConfig {
  outputWidth: number;        // Target width (auto-calculate if 0)
  outputHeight: number;       // Target height (auto-calculate if 0)
  preserveAspectRatio: boolean;
  interpolation: 'nearest' | 'linear' | 'cubic' | 'lanczos';
}

interface TransformResult {
  correctedImage: ImageData;
  transformMatrix: number[][];  // 3x3 homography matrix
  originalCorners: Point[];
  outputDimensions: { width: number; height: number };
}

class PerspectiveCorrector {
  private cv: OpenCV;

  // Apply perspective transform
  async correctPerspective(
    imageData: ImageData,
    corners: Point[],
    config: PerspectiveConfig
  ): Promise<TransformResult>;

  // Calculate optimal output dimensions
  calculateOutputDimensions(corners: Point[]): { width: number; height: number };

  // Compute homography matrix
  private computeHomography(srcPoints: Point[], dstPoints: Point[]): Mat;

  // Apply warp perspective
  private warpPerspective(src: Mat, matrix: Mat, size: Size): Mat;
}
```

#### 3.3.2 Perspective Correction Algorithm

```typescript
// Homography calculation pseudocode
function computeHomography(srcCorners: Point[], dstCorners: Point[]): Matrix3x3 {
  // Source corners (detected document corners)
  // Destination corners (rectangle corners)

  // Build system of equations: Ah = 0
  // Where A is 8x9 matrix, h is homography vector

  // Solve using SVD decomposition
  // Return 3x3 transformation matrix
}

// Output dimension calculation
function calculateOutputDimensions(corners: Point[]): Dimensions {
  const topWidth = distance(corners[0], corners[1]);
  const bottomWidth = distance(corners[3], corners[2]);
  const leftHeight = distance(corners[0], corners[3]);
  const rightHeight = distance(corners[1], corners[2]);

  return {
    width: Math.max(topWidth, bottomWidth),
    height: Math.max(leftHeight, rightHeight)
  };
}
```

### 3.4 Image Enhancement Module (`/src/modules/enhancement/`)

#### 3.4.1 ImageEnhancer Class

```typescript
interface EnhancementOptions {
  brightness: number;         // -100 to 100
  contrast: number;           // -100 to 100
  saturation: number;         // -100 to 100
  sharpness: number;          // 0 to 100
  gamma: number;              // 0.1 to 3.0
  shadows: number;            // -100 to 100
  highlights: number;         // -100 to 100
  temperature: number;        // -100 to 100 (cool to warm)
}

interface AutoEnhanceResult {
  enhancedImage: ImageData;
  appliedSettings: EnhancementOptions;
  originalHistogram: Histogram;
  enhancedHistogram: Histogram;
}

type FilterPreset =
  | 'original'
  | 'document'      // High contrast B&W
  | 'grayscale'     // Standard grayscale
  | 'magic'         // Auto-enhanced color
  | 'whiteboard'    // Optimized for whiteboards
  | 'book'          // Optimized for book pages
  | 'receipt'       // Optimized for receipts
  | 'photo'         // Color preservation
  | 'blueprint';    // Inverted colors

class ImageEnhancer {
  // Auto-enhancement (analyzes image and applies optimal settings)
  async autoEnhance(imageData: ImageData): Promise<AutoEnhanceResult>;

  // Manual enhancement with specific options
  enhance(imageData: ImageData, options: EnhancementOptions): ImageData;

  // Apply preset filter
  applyFilter(imageData: ImageData, preset: FilterPreset): ImageData;

  // Shadow removal
  removeShadows(imageData: ImageData): ImageData;

  // Noise reduction
  denoise(imageData: ImageData, strength: number): ImageData;

  // Adaptive thresholding for document mode
  adaptiveThreshold(imageData: ImageData): ImageData;

  // White balance correction
  autoWhiteBalance(imageData: ImageData): ImageData;

  // Histogram analysis
  analyzeHistogram(imageData: ImageData): Histogram;
}
```

#### 3.4.2 Enhancement Algorithms

```
┌─────────────────────────────────────────────────────────────────┐
│                  AUTO-ENHANCEMENT PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. HISTOGRAM ANALYSIS                                           │
│     ├── Calculate luminance histogram                            │
│     ├── Detect clipping (over/under exposure)                    │
│     ├── Calculate dynamic range                                  │
│     └── Determine image characteristics                          │
│                                                                  │
│  2. SHADOW/HIGHLIGHT RECOVERY                                    │
│     ├── Detect shadow regions (luminance < threshold)            │
│     ├── Apply local tone mapping                                 │
│     └── Blend with original preserving edges                     │
│                                                                  │
│  3. CONTRAST ENHANCEMENT                                         │
│     ├── Apply CLAHE (Contrast Limited Adaptive Histogram Eq.)    │
│     ├── Clip limit: 2.0                                          │
│     └── Tile grid size: 8x8                                      │
│                                                                  │
│  4. SHARPENING                                                   │
│     ├── Apply unsharp mask                                       │
│     │   ├── Gaussian blur (sigma: 1.0)                           │
│     │   └── Amount: 1.5, threshold: 0                            │
│     └── Edge-aware sharpening to prevent artifacts               │
│                                                                  │
│  5. DENOISING                                                    │
│     ├── Apply bilateral filter (preserves edges)                 │
│     │   ├── Diameter: 9                                          │
│     │   ├── Sigma color: 75                                      │
│     │   └── Sigma space: 75                                      │
│     └── Or Non-local means denoising for severe noise            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.4.3 Filter Preset Definitions

```typescript
const FILTER_PRESETS: Record<FilterPreset, EnhancementPipeline> = {
  document: {
    steps: [
      { type: 'grayscale' },
      { type: 'adaptiveThreshold', blockSize: 11, C: 2 },
      { type: 'denoise', strength: 3 },
      { type: 'sharpen', amount: 0.5 }
    ]
  },

  grayscale: {
    steps: [
      { type: 'grayscale' },
      { type: 'contrast', value: 10 },
      { type: 'sharpen', amount: 0.3 }
    ]
  },

  magic: {
    steps: [
      { type: 'autoWhiteBalance' },
      { type: 'autoContrast' },
      { type: 'shadowRecovery', amount: 30 },
      { type: 'sharpen', amount: 0.4 },
      { type: 'vibrance', amount: 15 }
    ]
  },

  whiteboard: {
    steps: [
      { type: 'whiteBalance', temperature: -10 },
      { type: 'brightness', value: 20 },
      { type: 'contrast', value: 40 },
      { type: 'saturation', value: -30 },
      { type: 'sharpen', amount: 0.6 }
    ]
  },

  // ... additional presets
};
```

### 3.5 OCR Module (`/src/modules/ocr/`)

#### 3.5.1 OCRService Class

```typescript
interface OCRConfig {
  language: string | string[];  // ISO language codes
  pageSegMode: PageSegMode;
  engineMode: EngineMode;
  preserveInterwordSpaces: boolean;
  characterWhitelist?: string;
  characterBlacklist?: string;
}

enum PageSegMode {
  AUTO = 3,                    // Fully automatic page segmentation
  SINGLE_COLUMN = 4,           // Assume single column of text
  SINGLE_BLOCK = 6,            // Assume uniform block of text
  SINGLE_LINE = 7,             // Treat image as single line
  SINGLE_WORD = 8,             // Treat image as single word
  SPARSE_TEXT = 11,            // Find as much text as possible
}

enum EngineMode {
  TESSERACT_ONLY = 0,
  LSTM_ONLY = 1,
  TESSERACT_LSTM = 2,
  DEFAULT = 3
}

interface OCRResult {
  text: string;
  confidence: number;          // 0-100
  words: OCRWord[];
  lines: OCRLine[];
  paragraphs: OCRParagraph[];
  blocks: OCRBlock[];
  processingTime: number;      // milliseconds
}

interface OCRWord {
  text: string;
  confidence: number;
  boundingBox: Rectangle;
  baseline: { x0: number; y0: number; x1: number; y1: number };
}

interface OCRLine {
  text: string;
  confidence: number;
  boundingBox: Rectangle;
  words: OCRWord[];
}

class OCRService {
  private worker: Tesseract.Worker | null;
  private loadedLanguages: Set<string>;

  // Initialize OCR engine
  async initialize(languages: string[]): Promise<void>;

  // Main recognition method
  async recognize(imageData: ImageData, config?: Partial<OCRConfig>): Promise<OCRResult>;

  // Recognize with progress callback
  async recognizeWithProgress(
    imageData: ImageData,
    onProgress: (progress: OCRProgress) => void,
    config?: Partial<OCRConfig>
  ): Promise<OCRResult>;

  // Detect text orientation and script
  async detectOrientation(imageData: ImageData): Promise<OrientationResult>;

  // Load additional language
  async loadLanguage(langCode: string): Promise<void>;

  // Get list of available languages
  getAvailableLanguages(): LanguageInfo[];

  // Cleanup
  async terminate(): Promise<void>;
}
```

#### 3.5.2 OCR Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     OCR PROCESSING PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PREPROCESSING (for better accuracy)                          │
│     ├── Convert to grayscale                                     │
│     ├── Apply Otsu's binarization                                │
│     ├── Deskew if rotation detected                              │
│     ├── Remove noise (morphological operations)                  │
│     └── Scale to optimal DPI (300 DPI recommended)               │
│                                                                  │
│  2. LAYOUT ANALYSIS                                              │
│     ├── Detect text regions                                      │
│     ├── Identify columns and blocks                              │
│     ├── Determine reading order                                  │
│     └── Separate text from images/graphics                       │
│                                                                  │
│  3. RECOGNITION                                                  │
│     ├── Character segmentation                                   │
│     ├── LSTM neural network recognition                          │
│     ├── Language model application                               │
│     └── Confidence scoring                                       │
│                                                                  │
│  4. POST-PROCESSING                                              │
│     ├── Spell checking (optional)                                │
│     ├── Format detection (dates, emails, phones)                 │
│     └── Structure reconstruction (tables, lists)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.5.3 Language Support Configuration

```typescript
const SUPPORTED_LANGUAGES = {
  // Tier 1: Pre-loaded, best support
  tier1: [
    { code: 'eng', name: 'English', size: '4.2MB' },
    { code: 'spa', name: 'Spanish', size: '3.8MB' },
    { code: 'fra', name: 'French', size: '3.6MB' },
    { code: 'deu', name: 'German', size: '4.1MB' },
  ],

  // Tier 2: On-demand loading
  tier2: [
    { code: 'chi_sim', name: 'Chinese (Simplified)', size: '18MB' },
    { code: 'chi_tra', name: 'Chinese (Traditional)', size: '19MB' },
    { code: 'jpn', name: 'Japanese', size: '14MB' },
    { code: 'kor', name: 'Korean', size: '8MB' },
    { code: 'ara', name: 'Arabic', size: '3.2MB' },
    { code: 'rus', name: 'Russian', size: '4.5MB' },
    // ... 100+ additional languages
  ]
};
```

### 3.6 Document Manager Module (`/src/modules/document/`)

#### 3.6.1 DocumentManager Class

```typescript
interface Document {
  id: string;                  // UUID
  name: string;
  createdAt: Date;
  updatedAt: Date;
  pages: DocumentPage[];
  tags: string[];
  metadata: DocumentMetadata;
}

interface DocumentPage {
  id: string;
  pageNumber: number;
  originalImage: Blob;         // Original captured image
  processedImage: Blob;        // After enhancement
  thumbnailImage: Blob;        // Low-res preview (200px)
  corners: Point[];            // Detected/adjusted corners
  enhancementSettings: EnhancementOptions;
  filterApplied: FilterPreset;
  ocrResult?: OCRResult;
  dimensions: { width: number; height: number };
}

interface DocumentMetadata {
  totalPages: number;
  hasOCR: boolean;
  fileSize: number;
  source: 'camera' | 'upload';
  deviceInfo?: string;
}

class DocumentManager {
  private db: IDBDatabase;

  // CRUD operations
  async createDocument(name: string): Promise<Document>;
  async getDocument(id: string): Promise<Document | null>;
  async updateDocument(id: string, updates: Partial<Document>): Promise<void>;
  async deleteDocument(id: string): Promise<void>;
  async listDocuments(options?: ListOptions): Promise<Document[]>;

  // Page operations
  async addPage(docId: string, page: Omit<DocumentPage, 'id'>): Promise<DocumentPage>;
  async updatePage(docId: string, pageId: string, updates: Partial<DocumentPage>): Promise<void>;
  async deletePage(docId: string, pageId: string): Promise<void>;
  async reorderPages(docId: string, newOrder: string[]): Promise<void>;

  // Export operations
  async exportToPDF(docId: string, options?: PDFExportOptions): Promise<Blob>;
  async exportToImages(docId: string, format: 'png' | 'jpeg', quality?: number): Promise<Blob[]>;
  async exportToText(docId: string): Promise<string>;

  // Search
  async searchByOCR(query: string): Promise<SearchResult[]>;
  async searchByTags(tags: string[]): Promise<Document[]>;

  // Storage management
  async getStorageUsage(): Promise<StorageUsage>;
  async clearStorage(): Promise<void>;
}
```

#### 3.6.2 IndexedDB Schema

```typescript
const DB_SCHEMA = {
  name: 'DocScannerDB',
  version: 1,
  stores: {
    documents: {
      keyPath: 'id',
      indexes: [
        { name: 'createdAt', keyPath: 'createdAt' },
        { name: 'updatedAt', keyPath: 'updatedAt' },
        { name: 'name', keyPath: 'name' }
      ]
    },
    pages: {
      keyPath: 'id',
      indexes: [
        { name: 'documentId', keyPath: 'documentId' },
        { name: 'pageNumber', keyPath: ['documentId', 'pageNumber'] }
      ]
    },
    blobs: {
      keyPath: 'id',
      indexes: [
        { name: 'pageId', keyPath: 'pageId' },
        { name: 'type', keyPath: 'type' }  // 'original', 'processed', 'thumbnail'
      ]
    },
    ocrResults: {
      keyPath: 'pageId',
      indexes: [
        { name: 'documentId', keyPath: 'documentId' },
        { name: 'fullText', keyPath: 'text', options: { unique: false } }
      ]
    },
    settings: {
      keyPath: 'key'
    }
  }
};
```

---

## 4. API Design

### 4.1 Internal Service API

```typescript
// Core application service interface
interface AppService {
  // Camera operations
  camera: {
    initialize(): Promise<void>;
    capture(): Promise<ImageData>;
    getStream(): MediaStream;
    dispose(): void;
  };

  // Processing pipeline
  processor: {
    detectEdges(image: ImageData): Promise<DetectedEdge | null>;
    correctPerspective(image: ImageData, corners: Point[]): Promise<ImageData>;
    enhance(image: ImageData, options?: EnhancementOptions): Promise<ImageData>;
    applyFilter(image: ImageData, filter: FilterPreset): Promise<ImageData>;
  };

  // OCR operations
  ocr: {
    initialize(languages: string[]): Promise<void>;
    recognize(image: ImageData): Promise<OCRResult>;
    getAvailableLanguages(): LanguageInfo[];
  };

  // Document management
  documents: {
    create(name: string): Promise<Document>;
    addPage(docId: string, image: ImageData, settings: PageSettings): Promise<DocumentPage>;
    export(docId: string, format: ExportFormat): Promise<Blob>;
    list(): Promise<Document[]>;
    delete(id: string): Promise<void>;
  };
}
```

### 4.2 State Management (Zustand Store)

```typescript
interface AppState {
  // Camera state
  camera: {
    isInitialized: boolean;
    isCapturing: boolean;
    stream: MediaStream | null;
    capabilities: CameraCapabilities | null;
    error: Error | null;
  };

  // Current scan session
  scanSession: {
    isActive: boolean;
    currentImage: ImageData | null;
    detectedEdges: DetectedEdge | null;
    adjustedCorners: Point[] | null;
    processedImage: ImageData | null;
    selectedFilter: FilterPreset;
    enhancementOptions: EnhancementOptions;
  };

  // OCR state
  ocr: {
    isInitialized: boolean;
    isProcessing: boolean;
    progress: number;
    result: OCRResult | null;
    selectedLanguages: string[];
  };

  // Documents
  documents: {
    list: Document[];
    currentDocument: Document | null;
    isLoading: boolean;
  };

  // UI state
  ui: {
    currentView: 'camera' | 'crop' | 'enhance' | 'ocr' | 'documents' | 'export';
    isProcessing: boolean;
    toasts: Toast[];
    modalOpen: string | null;
  };

  // Actions
  actions: {
    initializeCamera(): Promise<void>;
    captureImage(): Promise<void>;
    detectEdges(): Promise<void>;
    updateCorners(corners: Point[]): void;
    applyPerspectiveCorrection(): Promise<void>;
    applyEnhancement(options: EnhancementOptions): Promise<void>;
    setFilter(filter: FilterPreset): void;
    performOCR(): Promise<void>;
    saveToDocument(docId?: string): Promise<void>;
    exportDocument(docId: string, format: ExportFormat): Promise<void>;
  };
}
```

---

## 5. Data Models

### 5.1 Type Definitions

```typescript
// Geometry types
interface Point {
  x: number;
  y: number;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

// Image types
interface ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  colorSpace: 'srgb' | 'display-p3';
}

interface Histogram {
  red: number[];     // 256 values
  green: number[];
  blue: number[];
  luminance: number[];
  mean: { r: number; g: number; b: number; l: number };
  std: { r: number; g: number; b: number; l: number };
}

// Export types
type ExportFormat = 'pdf' | 'png' | 'jpeg' | 'txt';

interface PDFExportOptions {
  pageSize: 'a4' | 'letter' | 'legal' | 'original';
  orientation: 'auto' | 'portrait' | 'landscape';
  quality: 'low' | 'medium' | 'high' | 'original';
  includeOCR: boolean;      // Embed searchable text layer
  compression: boolean;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

interface ImageExportOptions {
  format: 'png' | 'jpeg';
  quality: number;          // 0.1 - 1.0 for JPEG
  maxDimension?: number;    // Scale down if larger
}
```

---

## 6. Image Processing Pipeline

### 6.1 Complete Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT SCANNING PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STAGE 1: CAPTURE                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Camera Init → Live Preview → Real-time Edge Detection → Capture   │ │
│  │       ↓              ↓                    ↓                  ↓     │ │
│  │  MediaStream    Canvas        OpenCV (downscaled)       ImageData  │ │
│  │  720p preview   30fps         ~15fps detection          Full res   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                      │
│  STAGE 2: CROP & PERSPECTIVE                                            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Edge Detection (full res) → Corner Adjustment → Perspective Warp  │ │
│  │          ↓                          ↓                     ↓        │ │
│  │    4 corner points           Manual drag UI        Homography      │ │
│  │    confidence score          touch/mouse           transform       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                      │
│  STAGE 3: ENHANCEMENT                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Auto-Enhance → Filter Selection → Manual Adjustments → Preview    │ │
│  │       ↓               ↓                    ↓               ↓       │ │
│  │  Histogram        Preset          Sliders/controls    Real-time    │ │
│  │  analysis         pipeline        (WebGL accelerated) Canvas       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                      │
│  STAGE 4: OCR (OPTIONAL)                                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Preprocess → Tesseract.js → Text Extraction → Searchable PDF      │ │
│  │       ↓            ↓               ↓                   ↓           │ │
│  │  Binarize      Web Worker      Word boxes         PDF text layer   │ │
│  │  Deskew        LSTM engine     Confidence                          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                      │
│  STAGE 5: EXPORT                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Format Selection → Compression → File Generation → Download/Share │ │
│  │        ↓                 ↓              ↓                ↓         │ │
│  │  PDF/PNG/JPEG      Quality       jsPDF/Canvas      Web Share API   │ │
│  │  Multi-page        settings      Blob creation     File download   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Performance Optimization Strategies

```typescript
const OPTIMIZATION_STRATEGIES = {
  // Real-time preview: Process at lower resolution
  realtimePreview: {
    maxWidth: 640,
    maxHeight: 480,
    targetFPS: 15,
    skipFrames: 2  // Process every 3rd frame
  },

  // Full processing: Use Web Workers
  processing: {
    useWebWorker: true,
    useWebGL: true,  // For filter operations
    useWASM: true,   // For OpenCV operations
    chunkSize: 1024 * 1024  // Process in 1MB chunks for large images
  },

  // Memory management
  memory: {
    maxImageCacheSize: 50 * 1024 * 1024,  // 50MB
    thumbnailSize: 200,  // px
    releaseAfterExport: true
  },

  // Progressive enhancement
  progressive: {
    showLowResFirst: true,
    streamResults: true
  }
};
```

### 6.3 WebGL Shader for Real-time Filters

```glsl
// Fragment shader for document enhancement
precision mediump float;

uniform sampler2D u_image;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_image, v_texCoord);

  // Apply brightness
  color.rgb += u_brightness;

  // Apply contrast
  color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;

  // Apply saturation
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, u_saturation);

  // Clamp values
  color.rgb = clamp(color.rgb, 0.0, 1.0);

  gl_FragColor = color;
}
```

---

## 7. UI/UX Components

### 7.1 Component Hierarchy

```
App
├── Header
│   ├── Logo
│   ├── DocumentTitle
│   └── MenuButton
│
├── MainView (conditional rendering based on current view)
│   │
│   ├── CameraView
│   │   ├── CameraPreview (video element with overlay)
│   │   ├── EdgeOverlay (SVG overlay showing detected edges)
│   │   ├── CaptureButton
│   │   ├── FlashToggle
│   │   ├── GalleryButton (import from photos)
│   │   └── CameraControls (zoom, focus)
│   │
│   ├── CropView
│   │   ├── ImageCanvas (captured image)
│   │   ├── CornerHandles (draggable corner points)
│   │   ├── GridOverlay (rule of thirds)
│   │   ├── AutoDetectButton
│   │   └── ActionButtons (retake, continue)
│   │
│   ├── EnhanceView
│   │   ├── PreviewCanvas (processed image)
│   │   ├── FilterCarousel (horizontal scrollable filters)
│   │   ├── AdjustmentSliders
│   │   │   ├── BrightnessSlider
│   │   │   ├── ContrastSlider
│   │   │   ├── SaturationSlider
│   │   │   └── SharpnessSlider
│   │   ├── CompareToggle (before/after)
│   │   └── ActionButtons (back, OCR, save)
│   │
│   ├── OCRView
│   │   ├── ImagePreview (with text boxes overlay)
│   │   ├── LanguageSelector
│   │   ├── ProgressIndicator
│   │   ├── TextOutput (editable extracted text)
│   │   ├── CopyButton
│   │   └── ActionButtons (back, save)
│   │
│   ├── DocumentsView
│   │   ├── SearchBar
│   │   ├── SortControls
│   │   ├── DocumentGrid/List
│   │   │   └── DocumentCard (thumbnail, name, date, pages)
│   │   ├── SelectionControls
│   │   └── FAB (new scan button)
│   │
│   └── DocumentDetailView
│       ├── PageThumbnails (reorderable)
│       ├── PagePreview (selected page)
│       ├── EditControls (per page)
│       └── ExportOptions
│
├── BottomNavigation
│   ├── CameraTab
│   ├── DocumentsTab
│   └── SettingsTab
│
└── Modals
    ├── ExportModal
    ├── LanguageModal
    ├── SettingsModal
    └── HelpModal
```

### 7.2 Component Specifications

#### 7.2.1 CameraPreview Component

```typescript
interface CameraPreviewProps {
  stream: MediaStream | null;
  onFrame?: (imageData: ImageData) => void;
  detectedEdges?: Point[];
  showGuides: boolean;
  aspectRatio?: number;
}

// Features:
// - Auto-rotation based on device orientation
// - Pinch-to-zoom support
// - Tap-to-focus support
// - Real-time edge overlay
// - Document guide frame
// - Low-light indicator
```

#### 7.2.2 CornerHandles Component

```typescript
interface CornerHandlesProps {
  corners: Point[];
  imageSize: Size;
  containerSize: Size;
  onChange: (corners: Point[]) => void;
  onCommit: () => void;
  magneticSnap: boolean;  // Snap to detected edges
  showMagnifier: boolean; // Show zoomed area when dragging
}

// Features:
// - Draggable corner points with touch support
// - Edge lines connecting corners
// - Magnifier showing detail on drag
// - Magnetic snapping to detected edges
// - Gesture support (two-finger rotate)
// - Accessibility: keyboard control
```

#### 7.2.3 FilterCarousel Component

```typescript
interface FilterCarouselProps {
  image: ImageData;
  selectedFilter: FilterPreset;
  onSelect: (filter: FilterPreset) => void;
}

// Features:
// - Horizontal scrollable list
// - Live preview thumbnails
// - Smooth scroll snapping
// - Selected state indicator
// - Lazy rendering for performance
```

### 7.3 Responsive Design Breakpoints

```typescript
const BREAKPOINTS = {
  mobile: {
    maxWidth: 480,
    layout: 'single-column',
    bottomNav: true,
    headerCompact: true
  },
  tablet: {
    minWidth: 481,
    maxWidth: 1024,
    layout: 'adaptive',
    sideNav: true,
    splitView: true  // Image + controls side by side
  },
  desktop: {
    minWidth: 1025,
    layout: 'multi-column',
    sideNav: true,
    multiPageView: true
  }
};
```

### 7.4 Touch Gestures

| Gesture | Context | Action |
|---------|---------|--------|
| Tap | Camera preview | Focus at point |
| Double tap | Image preview | Zoom in/out |
| Pinch | Camera/Preview | Zoom |
| Two-finger rotate | Crop view | Rotate image |
| Swipe left/right | Filter carousel | Change filter |
| Long press | Document list | Select mode |
| Drag | Corner handles | Adjust crop |
| Pull down | Documents list | Refresh |

---

## 8. File Structure

```
/src
├── /app
│   ├── App.tsx                    # Main app component
│   ├── Router.tsx                 # Route configuration
│   └── providers.tsx              # Context providers
│
├── /modules
│   ├── /camera
│   │   ├── CameraService.ts       # Camera initialization and capture
│   │   ├── CameraCapabilities.ts  # Capability detection
│   │   ├── useCameraStream.ts     # React hook for camera stream
│   │   └── constants.ts           # Camera constraints
│   │
│   ├── /edge-detection
│   │   ├── EdgeDetector.ts        # Main edge detection class
│   │   ├── ContourProcessor.ts    # Contour analysis utilities
│   │   ├── useEdgeDetection.ts    # React hook
│   │   └── worker.ts              # Web Worker for heavy processing
│   │
│   ├── /perspective
│   │   ├── PerspectiveCorrector.ts # Perspective transformation
│   │   ├── HomographyCalculator.ts # Matrix calculations
│   │   └── usePerspective.ts      # React hook
│   │
│   ├── /enhancement
│   │   ├── ImageEnhancer.ts       # Enhancement algorithms
│   │   ├── FilterPresets.ts       # Preset definitions
│   │   ├── WebGLRenderer.ts       # GPU-accelerated rendering
│   │   ├── HistogramAnalyzer.ts   # Image analysis
│   │   └── useEnhancement.ts      # React hook
│   │
│   ├── /ocr
│   │   ├── OCRService.ts          # Tesseract.js wrapper
│   │   ├── OCRPreprocessor.ts     # Image preprocessing for OCR
│   │   ├── LanguageManager.ts     # Language pack management
│   │   └── useOCR.ts              # React hook
│   │
│   ├── /document
│   │   ├── DocumentManager.ts     # Document CRUD operations
│   │   ├── DocumentExporter.ts    # Export functionality
│   │   ├── PDFGenerator.ts        # PDF creation
│   │   ├── StorageService.ts      # IndexedDB operations
│   │   └── useDocuments.ts        # React hook
│   │
│   └── /opencv
│       ├── OpenCVLoader.ts        # Lazy load OpenCV.js
│       ├── MatUtils.ts            # Mat manipulation utilities
│       └── types.ts               # OpenCV type definitions
│
├── /components
│   ├── /camera
│   │   ├── CameraPreview.tsx
│   │   ├── EdgeOverlay.tsx
│   │   ├── CaptureButton.tsx
│   │   └── CameraControls.tsx
│   │
│   ├── /crop
│   │   ├── CropView.tsx
│   │   ├── CornerHandles.tsx
│   │   ├── GridOverlay.tsx
│   │   └── Magnifier.tsx
│   │
│   ├── /enhance
│   │   ├── EnhanceView.tsx
│   │   ├── FilterCarousel.tsx
│   │   ├── FilterThumbnail.tsx
│   │   ├── AdjustmentSliders.tsx
│   │   └── BeforeAfterSlider.tsx
│   │
│   ├── /ocr
│   │   ├── OCRView.tsx
│   │   ├── LanguageSelector.tsx
│   │   ├── TextBoxOverlay.tsx
│   │   └── OCRProgress.tsx
│   │
│   ├── /documents
│   │   ├── DocumentsView.tsx
│   │   ├── DocumentGrid.tsx
│   │   ├── DocumentCard.tsx
│   │   ├── DocumentDetail.tsx
│   │   └── PageThumbnails.tsx
│   │
│   ├── /common
│   │   ├── Button.tsx
│   │   ├── IconButton.tsx
│   │   ├── Slider.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Spinner.tsx
│   │   └── BottomSheet.tsx
│   │
│   └── /layout
│       ├── Header.tsx
│       ├── BottomNavigation.tsx
│       └── MainContainer.tsx
│
├── /store
│   ├── index.ts                   # Zustand store setup
│   ├── cameraSlice.ts             # Camera state
│   ├── scanSlice.ts               # Scan session state
│   ├── ocrSlice.ts                # OCR state
│   ├── documentSlice.ts           # Document state
│   └── uiSlice.ts                 # UI state
│
├── /lib
│   ├── opencv-loader.ts           # OpenCV.js dynamic import
│   ├── tesseract-loader.ts        # Tesseract.js setup
│   ├── db.ts                      # IndexedDB setup
│   ├── canvas-utils.ts            # Canvas helper functions
│   ├── geometry.ts                # Point/vector math
│   ├── image-utils.ts             # Image conversion utilities
│   └── pdf-utils.ts               # PDF generation helpers
│
├── /hooks
│   ├── useDeviceOrientation.ts
│   ├── usePinchZoom.ts
│   ├── useDraggable.ts
│   ├── useImageProcessor.ts
│   └── useOfflineStatus.ts
│
├── /workers
│   ├── edge-detection.worker.ts
│   ├── enhancement.worker.ts
│   └── ocr.worker.ts
│
├── /styles
│   ├── globals.css                # Global styles
│   ├── tailwind.css               # Tailwind imports
│   └── animations.css             # Custom animations
│
├── /types
│   ├── index.ts                   # Shared type definitions
│   ├── opencv.d.ts                # OpenCV type declarations
│   └── tesseract.d.ts             # Tesseract type declarations
│
├── /constants
│   ├── filters.ts                 # Filter preset values
│   ├── camera.ts                  # Camera constants
│   └── app.ts                     # App-wide constants
│
├── /assets
│   ├── /icons                     # SVG icons
│   └── /images                    # Static images
│
├── main.tsx                       # Entry point
├── vite-env.d.ts
└── index.html

/public
├── manifest.json                  # PWA manifest
├── sw.js                          # Service worker
├── /icons                         # App icons (various sizes)
├── /lang                          # Tesseract language files
└── /wasm                          # OpenCV WASM files

/config
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
└── .env.example
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Core Setup)
**Goal:** Basic app structure with camera capture

**Tasks:**
1. Project initialization with Vite + React + TypeScript
2. Tailwind CSS setup with mobile-first configuration
3. PWA configuration (manifest, service worker, icons)
4. Camera module implementation
   - MediaDevices API integration
   - Camera selection (front/back)
   - Basic capture functionality
5. Basic UI shell
   - Bottom navigation
   - Camera view with preview
   - Capture button
6. State management setup (Zustand)

**Deliverables:**
- Working camera capture on mobile browsers
- PWA installable
- Responsive base layout

---

### Phase 2: Edge Detection & Cropping
**Goal:** Automatic document detection and manual crop adjustment

**Tasks:**
1. OpenCV.js integration
   - WASM loading strategy
   - Web Worker setup for processing
2. Edge detection implementation
   - Canny edge detection
   - Contour detection and filtering
   - Quadrilateral scoring
3. Real-time edge preview (on camera view)
4. Crop view UI
   - Corner handle components
   - Draggable interactions
   - Magnetic snapping
   - Magnifier on drag
5. Perspective correction
   - Homography calculation
   - Warp perspective transformation

**Deliverables:**
- Automatic document edge detection
- Interactive crop adjustment
- Perspective-corrected output

---

### Phase 3: Image Enhancement
**Goal:** Professional-quality image processing

**Tasks:**
1. Enhancement algorithms
   - Brightness/contrast adjustment
   - Shadow/highlight recovery
   - Sharpening (unsharp mask)
   - Noise reduction
2. WebGL renderer for real-time filters
3. Auto-enhancement pipeline
   - Histogram analysis
   - CLAHE implementation
   - Automatic white balance
4. Filter presets
   - Document mode (adaptive threshold)
   - Grayscale
   - Magic (auto-enhanced color)
   - Whiteboard optimization
5. Enhancement UI
   - Filter carousel
   - Adjustment sliders
   - Before/after comparison

**Deliverables:**
- Multiple filter presets
- Real-time enhancement preview
- Auto-enhancement feature

---

### Phase 4: OCR Integration
**Goal:** Text extraction from scanned documents

**Tasks:**
1. Tesseract.js integration
   - Web Worker setup
   - Language pack management
2. OCR preprocessing
   - Optimal binarization
   - Deskewing
   - DPI normalization
3. Recognition pipeline
   - Progress tracking
   - Confidence scoring
   - Word/line/paragraph detection
4. OCR UI
   - Language selector
   - Progress indicator
   - Text overlay on image
   - Editable text output
5. Copy/share functionality

**Deliverables:**
- Multi-language OCR support
- Searchable text extraction
- Copy/share text feature

---

### Phase 5: Document Management
**Goal:** Multi-page document handling and storage

**Tasks:**
1. IndexedDB implementation
   - Database schema
   - CRUD operations
   - Blob storage
2. Document manager
   - Create/edit/delete documents
   - Add/remove/reorder pages
   - Thumbnails generation
3. Documents list UI
   - Grid/list view
   - Search functionality
   - Sort options
   - Multi-select
4. Document detail view
   - Page thumbnails
   - Page editing
   - Reorder capability
5. Storage management
   - Usage display
   - Clear storage option

**Deliverables:**
- Multi-page document support
- Persistent local storage
- Document organization features

---

### Phase 6: Export & Sharing
**Goal:** Export documents in various formats

**Tasks:**
1. PDF generation (jsPDF)
   - Single/multi-page export
   - Custom page sizes
   - Quality options
   - OCR text layer (searchable PDF)
2. Image export
   - PNG/JPEG options
   - Quality settings
   - Batch export
3. Text export (from OCR)
4. Share integration
   - Web Share API
   - Download fallback
5. Export UI
   - Format selection
   - Options configuration
   - Progress feedback

**Deliverables:**
- PDF export (with optional searchable text)
- Image export (PNG/JPEG)
- Share functionality

---

### Phase 7: Polish & Optimization
**Goal:** Production-ready quality

**Tasks:**
1. Performance optimization
   - Bundle size reduction
   - Lazy loading optimization
   - Memory management
   - FPS optimization
2. Offline functionality
   - Service worker caching
   - Offline indicator
   - Background sync
3. Accessibility
   - Screen reader support
   - Keyboard navigation
   - High contrast mode
4. Error handling
   - Camera permission denied
   - Storage quota exceeded
   - Processing failures
5. Analytics & monitoring setup
6. Final testing
   - Cross-browser testing
   - Device testing
   - Performance profiling

**Deliverables:**
- Optimized production build
- Full offline support
- Accessible interface
- Comprehensive error handling

---

## 10. Performance Requirements

### 10.1 Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3.0s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Camera Initialization | < 2.0s | Custom timing |
| Edge Detection (preview) | < 100ms | Per frame |
| Edge Detection (full) | < 500ms | Per image |
| Perspective Correction | < 300ms | Per image |
| Filter Application | < 50ms | Per adjustment |
| OCR Processing | < 5s | Per page (English) |
| PDF Export | < 3s | Per 10 pages |
| App Install Size | < 5MB | Initial bundle |

### 10.2 Resource Budgets

```typescript
const RESOURCE_BUDGETS = {
  // JavaScript bundles
  js: {
    initial: 200 * 1024,        // 200KB initial bundle
    vendor: 300 * 1024,         // 300KB vendor bundle
    opencv: 8 * 1024 * 1024,    // 8MB OpenCV (lazy loaded)
    tesseract: 2 * 1024 * 1024, // 2MB Tesseract core
    languagePack: 5 * 1024 * 1024 // Up to 5MB per language
  },

  // CSS
  css: {
    total: 50 * 1024  // 50KB total CSS
  },

  // Images
  images: {
    icons: 100 * 1024,  // 100KB for all icons
    ui: 50 * 1024       // 50KB for UI images
  },

  // Runtime memory
  memory: {
    baseApp: 30 * 1024 * 1024,    // 30MB base
    perImage: 20 * 1024 * 1024,   // 20MB per full-res image
    opencv: 100 * 1024 * 1024,    // 100MB for OpenCV operations
    tesseract: 150 * 1024 * 1024  // 150MB for OCR
  }
};
```

### 10.3 Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome (Android) | 80+ | Primary target |
| Safari (iOS) | 14.5+ | Required for Camera API |
| Firefox (Android) | 90+ | Secondary support |
| Samsung Internet | 14+ | Popular in some regions |
| Chrome (Desktop) | 80+ | For development/testing |
| Safari (macOS) | 14+ | For development/testing |

### 10.4 Device Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 2GB | 4GB+ |
| Camera | 5MP | 12MP+ |
| Storage | 100MB available | 500MB+ |
| Network | None (offline) | 4G+ for downloads |

---

## Appendix A: External Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "tesseract.js": "^5.0.0",
    "jspdf": "^2.5.1",
    "idb": "^7.1.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "vite-plugin-pwa": "^0.17.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

**Note:** OpenCV.js is loaded from CDN or self-hosted WASM files, not as an npm package.

---

## Appendix B: Security Considerations

1. **Camera Permissions**: Always request with clear user consent; handle denial gracefully
2. **Data Storage**: All data stored locally; no server transmission unless user exports
3. **HTTPS Required**: PWA features require secure context
4. **Content Security Policy**: Strict CSP for production
5. **Input Validation**: Validate all user inputs and file uploads
6. **Memory Cleanup**: Properly dispose of camera streams and canvas contexts

---

## Appendix C: Accessibility Requirements

1. **WCAG 2.1 AA Compliance** target
2. **Screen Reader Support**: All interactive elements labeled
3. **Keyboard Navigation**: Full app usable without touch
4. **Color Contrast**: Minimum 4.5:1 ratio
5. **Motion Preferences**: Respect `prefers-reduced-motion`
6. **Touch Targets**: Minimum 44x44px

---

*Document Version: 1.0*
*Last Updated: 2025-01-XX*
