import { create } from 'zustand';
import type {
  CameraCapabilities,
  DetectedEdge,
  Point,
  FilterPreset,
  EnhancementOptions,
  OCRResult,
  Document,
  ViewType,
  Toast,
} from '@/types';
import { DEFAULT_ENHANCEMENT_OPTIONS } from '@/constants/filters';

interface CameraState {
  isInitialized: boolean;
  isCapturing: boolean;
  stream: MediaStream | null;
  capabilities: CameraCapabilities | null;
  error: Error | null;
}

interface ScanSessionState {
  isActive: boolean;
  currentImage: ImageData | null;
  detectedEdges: DetectedEdge | null;
  adjustedCorners: Point[] | null;
  processedImage: ImageData | null;
  selectedFilter: FilterPreset;
  enhancementOptions: EnhancementOptions;
}

interface OCRState {
  isInitialized: boolean;
  isProcessing: boolean;
  progress: number;
  result: OCRResult | null;
  selectedLanguages: string[];
}

interface DocumentsState {
  list: Document[];
  currentDocument: Document | null;
  isLoading: boolean;
}

interface UIState {
  currentView: ViewType;
  isProcessing: boolean;
  toasts: Toast[];
  modalOpen: string | null;
}

interface AppState {
  camera: CameraState;
  scanSession: ScanSessionState;
  ocr: OCRState;
  documents: DocumentsState;
  ui: UIState;

  // Camera actions
  setCameraInitialized: (initialized: boolean) => void;
  setCameraStream: (stream: MediaStream | null) => void;
  setCameraCapabilities: (capabilities: CameraCapabilities | null) => void;
  setCameraError: (error: Error | null) => void;
  setCapturing: (capturing: boolean) => void;

  // Scan session actions
  startScanSession: (image: ImageData) => void;
  setDetectedEdges: (edges: DetectedEdge | null) => void;
  setAdjustedCorners: (corners: Point[] | null) => void;
  setProcessedImage: (image: ImageData | null) => void;
  setSelectedFilter: (filter: FilterPreset) => void;
  setEnhancementOptions: (options: EnhancementOptions) => void;
  resetScanSession: () => void;

  // OCR actions
  setOCRInitialized: (initialized: boolean) => void;
  setOCRProcessing: (processing: boolean) => void;
  setOCRProgress: (progress: number) => void;
  setOCRResult: (result: OCRResult | null) => void;
  setSelectedLanguages: (languages: string[]) => void;

  // Document actions
  setDocuments: (documents: Document[]) => void;
  setCurrentDocument: (document: Document | null) => void;
  setDocumentsLoading: (loading: boolean) => void;
  addDocument: (document: Document) => void;
  removeDocument: (id: string) => void;

  // UI actions
  setCurrentView: (view: ViewType) => void;
  setProcessing: (processing: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setModalOpen: (modal: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  camera: {
    isInitialized: false,
    isCapturing: false,
    stream: null,
    capabilities: null,
    error: null,
  },
  scanSession: {
    isActive: false,
    currentImage: null,
    detectedEdges: null,
    adjustedCorners: null,
    processedImage: null,
    selectedFilter: 'original',
    enhancementOptions: DEFAULT_ENHANCEMENT_OPTIONS,
  },
  ocr: {
    isInitialized: false,
    isProcessing: false,
    progress: 0,
    result: null,
    selectedLanguages: ['eng'],
  },
  documents: {
    list: [],
    currentDocument: null,
    isLoading: false,
  },
  ui: {
    currentView: 'camera',
    isProcessing: false,
    toasts: [],
    modalOpen: null,
  },

  // Camera actions
  setCameraInitialized: (initialized) =>
    set((state) => ({
      camera: { ...state.camera, isInitialized: initialized },
    })),
  setCameraStream: (stream) =>
    set((state) => ({
      camera: { ...state.camera, stream },
    })),
  setCameraCapabilities: (capabilities) =>
    set((state) => ({
      camera: { ...state.camera, capabilities },
    })),
  setCameraError: (error) =>
    set((state) => ({
      camera: { ...state.camera, error },
    })),
  setCapturing: (capturing) =>
    set((state) => ({
      camera: { ...state.camera, isCapturing: capturing },
    })),

  // Scan session actions
  startScanSession: (image) =>
    set({
      scanSession: {
        isActive: true,
        currentImage: image,
        detectedEdges: null,
        adjustedCorners: null,
        processedImage: null,
        selectedFilter: 'original',
        enhancementOptions: DEFAULT_ENHANCEMENT_OPTIONS,
      },
    }),
  setDetectedEdges: (edges) =>
    set((state) => ({
      scanSession: { ...state.scanSession, detectedEdges: edges },
    })),
  setAdjustedCorners: (corners) =>
    set((state) => ({
      scanSession: { ...state.scanSession, adjustedCorners: corners },
    })),
  setProcessedImage: (image) =>
    set((state) => ({
      scanSession: { ...state.scanSession, processedImage: image },
    })),
  setSelectedFilter: (filter) =>
    set((state) => ({
      scanSession: { ...state.scanSession, selectedFilter: filter },
    })),
  setEnhancementOptions: (options) =>
    set((state) => ({
      scanSession: { ...state.scanSession, enhancementOptions: options },
    })),
  resetScanSession: () =>
    set({
      scanSession: {
        isActive: false,
        currentImage: null,
        detectedEdges: null,
        adjustedCorners: null,
        processedImage: null,
        selectedFilter: 'original',
        enhancementOptions: DEFAULT_ENHANCEMENT_OPTIONS,
      },
    }),

  // OCR actions
  setOCRInitialized: (initialized) =>
    set((state) => ({
      ocr: { ...state.ocr, isInitialized: initialized },
    })),
  setOCRProcessing: (processing) =>
    set((state) => ({
      ocr: { ...state.ocr, isProcessing: processing },
    })),
  setOCRProgress: (progress) =>
    set((state) => ({
      ocr: { ...state.ocr, progress },
    })),
  setOCRResult: (result) =>
    set((state) => ({
      ocr: { ...state.ocr, result },
    })),
  setSelectedLanguages: (languages) =>
    set((state) => ({
      ocr: { ...state.ocr, selectedLanguages: languages },
    })),

  // Document actions
  setDocuments: (documents) =>
    set((state) => ({
      documents: { ...state.documents, list: documents },
    })),
  setCurrentDocument: (document) =>
    set((state) => ({
      documents: { ...state.documents, currentDocument: document },
    })),
  setDocumentsLoading: (loading) =>
    set((state) => ({
      documents: { ...state.documents, isLoading: loading },
    })),
  addDocument: (document) =>
    set((state) => ({
      documents: {
        ...state.documents,
        list: [document, ...state.documents.list],
      },
    })),
  removeDocument: (id) =>
    set((state) => ({
      documents: {
        ...state.documents,
        list: state.documents.list.filter((doc) => doc.id !== id),
      },
    })),

  // UI actions
  setCurrentView: (view) =>
    set((state) => ({
      ui: { ...state.ui, currentView: view },
    })),
  setProcessing: (processing) =>
    set((state) => ({
      ui: { ...state.ui, isProcessing: processing },
    })),
  addToast: (toast) =>
    set((state) => ({
      ui: {
        ...state.ui,
        toasts: [
          ...state.ui.toasts,
          { ...toast, id: Math.random().toString(36).substr(2, 9) },
        ],
      },
    })),
  removeToast: (id) =>
    set((state) => ({
      ui: {
        ...state.ui,
        toasts: state.ui.toasts.filter((t) => t.id !== id),
      },
    })),
  setModalOpen: (modal) =>
    set((state) => ({
      ui: { ...state.ui, modalOpen: modal },
    })),
}));
