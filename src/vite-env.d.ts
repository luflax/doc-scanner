/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_OPENCV_URL: string;
  readonly VITE_TESSERACT_CORE_URL: string;
  readonly VITE_TESSERACT_LANG_URL: string;
  readonly VITE_ENABLE_OCR: string;
  readonly VITE_ENABLE_ADVANCED_FILTERS: string;
  readonly VITE_ENABLE_ANALYTICS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
