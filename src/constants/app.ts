export const APP_NAME = 'Document Scanner';
export const APP_VERSION = '1.0.0';

export const DB_NAME = 'DocScannerDB';
export const DB_VERSION = 1;

export const OPTIMIZATION_STRATEGIES = {
  realtimePreview: {
    maxWidth: 640,
    maxHeight: 480,
    targetFPS: 15,
    skipFrames: 2,
  },
  processing: {
    useWebWorker: true,
    useWebGL: true,
    useWASM: true,
    chunkSize: 1024 * 1024,
  },
  memory: {
    maxImageCacheSize: 50 * 1024 * 1024,
    thumbnailSize: 200,
    releaseAfterExport: true,
  },
  progressive: {
    showLowResFirst: true,
    streamResults: true,
  },
};

export const RESOURCE_BUDGETS = {
  js: {
    initial: 200 * 1024,
    vendor: 300 * 1024,
    opencv: 8 * 1024 * 1024,
    tesseract: 2 * 1024 * 1024,
    languagePack: 5 * 1024 * 1024,
  },
  css: {
    total: 50 * 1024,
  },
  images: {
    icons: 100 * 1024,
    ui: 50 * 1024,
  },
  memory: {
    baseApp: 30 * 1024 * 1024,
    perImage: 20 * 1024 * 1024,
    opencv: 100 * 1024 * 1024,
    tesseract: 150 * 1024 * 1024,
  },
};

export const BREAKPOINTS = {
  mobile: {
    maxWidth: 480,
    layout: 'single-column',
    bottomNav: true,
    headerCompact: true,
  },
  tablet: {
    minWidth: 481,
    maxWidth: 1024,
    layout: 'adaptive',
    sideNav: true,
    splitView: true,
  },
  desktop: {
    minWidth: 1025,
    layout: 'multi-column',
    sideNav: true,
    multiPageView: true,
  },
};
